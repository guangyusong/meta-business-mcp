#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { realpathSync } from "node:fs";
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { fileURLToPath, pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { redactSecrets } from "@meta-business-mcp/audit";
import { MetaClientBoundary } from "@meta-business-mcp/meta-client";
import { assertWritesDisabled, defaultPolicy, isToolAllowed } from "@meta-business-mcp/policy";
import {
  assertNoForbiddenToolNames,
  ToolContracts,
  type ToolName
} from "@meta-business-mcp/schemas";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { loadRuntimeConfig, type RuntimeConfig } from "./config.js";
import { handleToolCall } from "./handlers.js";

const VERSION = "0.1.1";

function toolResponse(payload: unknown): {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: Record<string, unknown>;
} {
  const redacted = redactSecrets(payload);
  const structuredContent = redacted && typeof redacted === "object" && !Array.isArray(redacted)
    ? redacted as Record<string, unknown>
    : { value: redacted };
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(redacted, null, 2)
      }
    ],
    structuredContent
  };
}

function securitySchemes(config: RuntimeConfig, readOnly: boolean): Array<Record<string, unknown>> {
  if (!config.httpAuth.enabled) {
    return [{ type: "noauth" }];
  }

  return [{
    type: "oauth2",
    scopes: config.httpAuth.requiredScopes.length > 0
      ? config.httpAuth.requiredScopes
      : [readOnly ? "meta_business.read" : "meta_business.write"]
  }];
}

export function createServer(config: RuntimeConfig = loadRuntimeConfig()): McpServer {
  assertNoForbiddenToolNames(Object.keys(ToolContracts));
  assertWritesDisabled(defaultPolicy);
  new MetaClientBoundary().assertReadOnly();

  const server = new McpServer({
    name: "meta-business-mcp",
    version: VERSION
  });

  for (const [toolName, contract] of Object.entries(ToolContracts)) {
    if (!isToolAllowed(toolName as ToolName, defaultPolicy)) {
      continue;
    }
    server.registerTool(
      toolName,
      {
        title: contract.title,
        description: contract.description,
        inputSchema: contract.inputSchema,
        annotations: contract.annotations,
        _meta: {
          securitySchemes: securitySchemes(config, contract.annotations.readOnlyHint)
        }
      },
      async (input: unknown) => toolResponse(await handleToolCall(toolName as ToolName, input, { config }))
    );
  }

  return server;
}

export async function runStdio(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("meta-business-mcp stdio server started");
}

type AuthenticatedRequest = IncomingMessage & {
  auth?: AuthInfo;
};

class HttpAuthError extends Error {
  readonly errorCode: string;
  readonly statusCode: number;

  constructor(errorCode: string, message: string, statusCode = 401) {
    super(message);
    this.name = "HttpAuthError";
    this.errorCode = errorCode;
    this.statusCode = statusCode;
  }
}

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function parsePort(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "3000", 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65_535) {
    throw new Error("META_BUSINESS_MCP_HTTP_PORT/PORT must be a valid TCP port.");
  }
  return parsed;
}

function splitCsv(value: string | undefined): string[] {
  return value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
}

function requestUrl(req: IncomingMessage): URL {
  return new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
}

function publicBaseUrl(req: IncomingMessage): string {
  const configured = process.env.META_BUSINESS_MCP_PUBLIC_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  const proto = String(req.headers["x-forwarded-proto"] ?? "http").split(",")[0]?.trim() || "http";
  const host = String(req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost");
  return `${proto}://${host}`.replace(/\/+$/, "");
}

function resourceUrl(req: IncomingMessage): string {
  return `${publicBaseUrl(req)}/mcp`;
}

function resourceMetadataUrl(req: IncomingMessage): string {
  return `${publicBaseUrl(req)}/.well-known/oauth-protected-resource/mcp`;
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown, headers: Record<string, string> = {}): void {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    ...headers
  });
  res.end(`${JSON.stringify(redactSecrets(body), null, 2)}\n`);
}

function setCorsHeaders(req: IncomingMessage, res: ServerResponse): void {
  const origin = req.headers.origin;
  const allowedOrigins = splitCsv(process.env.META_BUSINESS_MCP_ALLOWED_ORIGINS);
  if (typeof origin === "string") {
    if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
      res.setHeader("access-control-allow-origin", origin);
      res.setHeader("vary", "Origin");
    }
  }
  res.setHeader("access-control-allow-methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("access-control-allow-headers", "authorization,content-type,mcp-session-id,last-event-id");
  res.setHeader("access-control-expose-headers", "mcp-session-id,www-authenticate");
}

function assertOriginAllowed(req: IncomingMessage): void {
  const origin = req.headers.origin;
  const allowedOrigins = splitCsv(process.env.META_BUSINESS_MCP_ALLOWED_ORIGINS);
  if (typeof origin !== "string" || allowedOrigins.length === 0 || allowedOrigins.includes("*")) {
    return;
  }
  if (!allowedOrigins.includes(origin)) {
    throw new HttpAuthError("invalid_request", "Origin is not allowed for this MCP server.", 403);
  }
}

function authChallenge(req: IncomingMessage, errorCode = "invalid_token", description = "Bearer token required"): string {
  return `Bearer error="${errorCode}", error_description="${description.replace(/"/g, "'")}", resource_metadata="${resourceMetadataUrl(req)}"`;
}

function getJwks(jwksUrl: string): ReturnType<typeof createRemoteJWKSet> {
  const cached = jwksCache.get(jwksUrl);
  if (cached) {
    return cached;
  }
  const jwks = createRemoteJWKSet(new URL(jwksUrl));
  jwksCache.set(jwksUrl, jwks);
  return jwks;
}

function scopesFromPayload(payload: JWTPayload): string[] {
  const scope = payload.scope;
  if (typeof scope === "string") {
    return scope.split(/\s+/).filter(Boolean);
  }
  const scp = payload.scp;
  if (Array.isArray(scp)) {
    return scp.filter((item): item is string => typeof item === "string");
  }
  return [];
}

async function verifyHttpAuth(req: IncomingMessage, config: RuntimeConfig): Promise<AuthInfo | undefined> {
  if (!config.httpAuth.enabled) {
    return undefined;
  }
  if (!config.httpAuth.issuer || !config.httpAuth.audience || !config.httpAuth.jwksUrl) {
    throw new HttpAuthError("server_error", "HTTP auth is enabled but issuer, audience, or JWKS URL is not configured.", 500);
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw new HttpAuthError("invalid_token", "Missing Authorization header.");
  }
  const [type, token] = authHeader.split(/\s+/, 2);
  if (type !== "Bearer" || !token) {
    throw new HttpAuthError("invalid_token", "Authorization header must use Bearer TOKEN.");
  }

  const { payload } = await jwtVerify(token, getJwks(config.httpAuth.jwksUrl), {
    issuer: config.httpAuth.issuer,
    audience: config.httpAuth.audience
  }).catch((error: unknown) => {
    throw new HttpAuthError("invalid_token", error instanceof Error ? error.message : "Token verification failed.");
  });

  const scopes = scopesFromPayload(payload);
  const missingScopes = config.httpAuth.requiredScopes.filter((scope) => !scopes.includes(scope));
  if (missingScopes.length > 0) {
    throw new HttpAuthError("insufficient_scope", `Missing required scopes: ${missingScopes.join(", ")}`);
  }

  return {
    token,
    clientId: typeof payload.client_id === "string"
      ? payload.client_id
      : typeof payload.azp === "string"
        ? payload.azp
        : typeof payload.sub === "string"
          ? payload.sub
          : "unknown-client",
    scopes,
    ...(typeof payload.exp === "number" ? { expiresAt: payload.exp } : {}),
    resource: new URL(resourceUrl(req)),
    extra: {
      subject: payload.sub,
      issuer: payload.iss,
      audience: payload.aud
    }
  };
}

function protectedResourceMetadata(req: IncomingMessage, config: RuntimeConfig): Record<string, unknown> {
  return {
    resource: resourceUrl(req),
    authorization_servers: config.httpAuth.issuer ? [config.httpAuth.issuer] : [],
    scopes_supported: config.httpAuth.requiredScopes,
    bearer_methods_supported: ["header"],
    resource_documentation: "https://github.com/guangyusong/meta-business-mcp"
  };
}

async function handleHttpRequest(req: AuthenticatedRequest, res: ServerResponse, config: RuntimeConfig): Promise<void> {
  setCorsHeaders(req, res);
  assertOriginAllowed(req);
  const url = requestUrl(req);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if ((pathname === "/" || pathname === "/healthz") && req.method === "GET") {
    sendJson(res, 200, {
      name: "meta-business-mcp",
      version: VERSION,
      transport: "streamable_http",
      mcp_path: "/mcp",
      auth_enabled: config.httpAuth.enabled
    });
    return;
  }

  if ((pathname === "/.well-known/oauth-protected-resource" || pathname === "/.well-known/oauth-protected-resource/mcp") && req.method === "GET") {
    sendJson(res, 200, protectedResourceMetadata(req, config));
    return;
  }

  if (pathname !== "/mcp") {
    sendJson(res, 404, { error: "not_found" });
    return;
  }

  const authInfo = await verifyHttpAuth(req, config);
  if (authInfo) {
    req.auth = authInfo;
  }
  const server = createServer(config);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID()
  });
  await server.connect(transport as unknown as Parameters<McpServer["connect"]>[0]);
  res.on("close", () => {
    void transport.close();
    void server.close();
  });
  await transport.handleRequest(req, res);
}

export async function runHttp(): Promise<void> {
  const config = loadRuntimeConfig();
  const port = parsePort(process.env.META_BUSINESS_MCP_HTTP_PORT ?? process.env.PORT);
  const host = process.env.META_BUSINESS_MCP_HTTP_HOST?.trim() || process.env.HOST?.trim() || "127.0.0.1";
  const httpServer = createHttpServer((req, res) => {
    handleHttpRequest(req, res, config).catch((error: unknown) => {
      if (res.headersSent) {
        res.end();
        return;
      }
      if (error instanceof HttpAuthError) {
        const headers = error.statusCode === 401
          ? { "www-authenticate": authChallenge(req, error.errorCode, error.message) }
          : {};
        sendJson(res, error.statusCode, {
          error: {
            code: error.errorCode,
            message: error.message
          }
        }, headers);
        return;
      }
      sendJson(res, 500, {
        error: {
          code: "server_error",
          message: error instanceof Error ? error.message : "HTTP MCP request failed."
        }
      });
    });
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(port, host, () => {
      httpServer.off("error", reject);
      resolve();
    });
  });
  console.error(`meta-business-mcp HTTP server started at http://${host}:${port}/mcp`);
}

function requestedTransport(argv: readonly string[]): "stdio" | "http" {
  const index = argv.indexOf("--transport");
  if (index === -1) {
    return "stdio";
  }
  const value = argv[index + 1];
  if (value === "stdio" || value === "http") {
    return value;
  }
  throw new Error("Expected --transport stdio or --transport http");
}

async function main(): Promise<void> {
  const transport = requestedTransport(process.argv);
  if (transport === "stdio") {
    await runStdio();
    return;
  }
  await runHttp();
}

export function isMainModule(moduleUrl: string, entryPath: string | undefined): boolean {
  if (!entryPath) {
    return false;
  }
  try {
    return realpathSync(fileURLToPath(moduleUrl)) === realpathSync(entryPath);
  } catch {
    return moduleUrl === pathToFileURL(entryPath).href;
  }
}

if (isMainModule(import.meta.url, process.argv[1])) {
  main().catch((error: unknown) => {
    console.error(redactSecrets(error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  });
}
