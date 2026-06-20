#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { redactSecrets } from "@meta-business-mcp/audit";
import { MetaClientBoundary } from "@meta-business-mcp/meta-client";
import { assertWritesDisabled, defaultPolicy } from "@meta-business-mcp/policy";
import {
  assertNoForbiddenToolNames,
  skeletonSafeError,
  ToolContracts
} from "@meta-business-mcp/schemas";

const VERSION = "0.1.0";

export function createServer(): McpServer {
  assertNoForbiddenToolNames(Object.keys(ToolContracts));
  assertWritesDisabled(defaultPolicy);
  new MetaClientBoundary().assertReadOnly();

  const server = new McpServer({
    name: "meta-business-mcp",
    version: VERSION
  });

  for (const [toolName, contract] of Object.entries(ToolContracts)) {
    server.registerTool(
      toolName,
      {
        title: contract.title,
        description: contract.description,
        inputSchema: contract.inputSchema,
        annotations: contract.annotations
      },
      async () => {
        const payload = redactSecrets(skeletonSafeError(toolName));
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(payload, null, 2)
            }
          ],
          structuredContent: payload
        };
      }
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

export async function runHttpPlaceholder(): Promise<void> {
  throw new Error("Streamable HTTP transport is intentionally not enabled in the public skeleton. Add OAuth, Origin validation, and session handling first.");
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
  await runHttpPlaceholder();
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error: unknown) => {
    console.error(redactSecrets(error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  });
}
