import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { normalizeConfiguredAdAccounts, type ConfiguredAdAccount, META_GRAPH_API_VERSION } from "@meta-business-mcp/meta-client";

export type ConfiguredAsset = {
  id: string;
  name?: string;
  status?: string;
  alias?: string;
};

export type RuntimeConfig = {
  accessToken?: string;
  apiVersion: string;
  adAccounts: ConfiguredAdAccount[];
  pages: ConfiguredAsset[];
  instagramAccounts: ConfiguredAsset[];
  pixels: ConfiguredAsset[];
  businesses: ConfiguredAsset[];
  requestTimeoutMs: number;
  storageDir: string;
  writesEnabled: boolean;
  maxBudgetChangePercent: number;
  httpAuth: {
    enabled: boolean;
    issuer?: string;
    audience?: string;
    jwksUrl?: string;
    requiredScopes: string[];
  };
};

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parseJsonSource(source: string, label: string): unknown {
  try {
    return JSON.parse(source);
  } catch (error: unknown) {
    throw new Error(`${label} must contain valid JSON`, { cause: error });
  }
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const cleaned = clean(value);
  if (!cleaned) {
    return fallback;
  }
  const parsed = Number.parseInt(cleaned, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBoolean(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes((value ?? "").trim().toLowerCase());
}

function parsePositiveNumber(value: string | undefined, fallback: number): number {
  const cleaned = clean(value);
  if (!cleaned) {
    return fallback;
  }
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function splitCsv(value: string | undefined): string[] {
  return clean(value)?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
}

function loadAccountAllowlist(env: NodeJS.ProcessEnv): ConfiguredAdAccount[] {
  const inlineJson = clean(env.META_BUSINESS_MCP_AD_ACCOUNTS_JSON);
  if (inlineJson) {
    return normalizeConfiguredAdAccounts(parseJsonSource(inlineJson, "META_BUSINESS_MCP_AD_ACCOUNTS_JSON"));
  }

  const filePath = clean(env.META_BUSINESS_MCP_AD_ACCOUNTS_FILE);
  if (filePath) {
    const contents = readFileSync(filePath, "utf8");
    return normalizeConfiguredAdAccounts(parseJsonSource(contents, "META_BUSINESS_MCP_AD_ACCOUNTS_FILE"));
  }

  const accountIds = clean(env.META_AD_ACCOUNT_IDS);
  if (accountIds) {
    return normalizeConfiguredAdAccounts(
      accountIds.split(",").map((id) => ({
        id: id.trim(),
        status: "active"
      }))
    );
  }

  return [];
}

function normalizeConfiguredAssets(raw: unknown, idKeys: readonly string[]): ConfiguredAsset[] {
  const source = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { assets?: unknown }).assets)
      ? (raw as { assets: unknown[] }).assets
      : raw && typeof raw === "object" && Array.isArray((raw as { pages?: unknown }).pages)
        ? (raw as { pages: unknown[] }).pages
        : raw && typeof raw === "object" && Array.isArray((raw as { instagram_accounts?: unknown }).instagram_accounts)
          ? (raw as { instagram_accounts: unknown[] }).instagram_accounts
          : raw && typeof raw === "object" && Array.isArray((raw as { pixels?: unknown }).pixels)
            ? (raw as { pixels: unknown[] }).pixels
            : raw && typeof raw === "object" && Array.isArray((raw as { businesses?: unknown }).businesses)
              ? (raw as { businesses: unknown[] }).businesses
              : [];

  const seen = new Set<string>();
  const assets: ConfiguredAsset[] = [];
  for (const item of source) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const record = item as Record<string, unknown>;
    const rawId = idKeys
      .map((key) => record[key])
      .find((value): value is string => typeof value === "string" && value.trim().length > 0);
    if (!rawId) {
      continue;
    }
    const status = typeof record.status === "string" ? record.status.trim().toLowerCase() : undefined;
    if (status && status !== "active") {
      continue;
    }
    const id = rawId.trim();
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    const name = typeof record.name === "string"
      ? clean(record.name)
      : typeof record.asset_name === "string"
        ? clean(record.asset_name)
        : undefined;
    const alias = typeof record.alias === "string" ? clean(record.alias) : undefined;
    assets.push({
      id,
      ...(name ? { name } : {}),
      ...(status ? { status } : {}),
      ...(alias ? { alias } : {})
    });
  }
  return assets;
}

function loadAssetAllowlist(env: NodeJS.ProcessEnv, options: {
  jsonEnv: string;
  fileEnv: string;
  idsEnv: string;
  idKeys: readonly string[];
  arrayKey: string;
}): ConfiguredAsset[] {
  const inlineJson = clean(env[options.jsonEnv]);
  if (inlineJson) {
    return normalizeConfiguredAssets(parseJsonSource(inlineJson, options.jsonEnv), options.idKeys);
  }

  const filePath = clean(env[options.fileEnv]);
  if (filePath) {
    const contents = readFileSync(filePath, "utf8");
    return normalizeConfiguredAssets(parseJsonSource(contents, options.fileEnv), options.idKeys);
  }

  const ids = splitCsv(env[options.idsEnv]);
  if (ids.length > 0) {
    return normalizeConfiguredAssets({
      [options.arrayKey]: ids.map((id) => ({ id, status: "active" }))
    }, ["id"]);
  }

  return [];
}

export function loadRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const accessToken = clean(env.META_ADS_TOKEN);
  const authIssuer = clean(env.META_BUSINESS_MCP_AUTH_ISSUER);
  const authAudience = clean(env.META_BUSINESS_MCP_AUTH_AUDIENCE);
  const authJwksUrl = clean(env.META_BUSINESS_MCP_AUTH_JWKS_URL);
  return {
    ...(accessToken ? { accessToken } : {}),
    apiVersion: clean(env.META_ADS_API_VERSION) ?? META_GRAPH_API_VERSION,
    adAccounts: loadAccountAllowlist(env),
    pages: loadAssetAllowlist(env, {
      jsonEnv: "META_BUSINESS_MCP_PAGES_JSON",
      fileEnv: "META_BUSINESS_MCP_PAGES_FILE",
      idsEnv: "META_PAGE_IDS",
      idKeys: ["id", "page_id"],
      arrayKey: "pages"
    }),
    instagramAccounts: loadAssetAllowlist(env, {
      jsonEnv: "META_BUSINESS_MCP_INSTAGRAM_ACCOUNTS_JSON",
      fileEnv: "META_BUSINESS_MCP_INSTAGRAM_ACCOUNTS_FILE",
      idsEnv: "META_INSTAGRAM_ACCOUNT_IDS",
      idKeys: ["id", "instagram_account_id"],
      arrayKey: "instagram_accounts"
    }),
    pixels: loadAssetAllowlist(env, {
      jsonEnv: "META_BUSINESS_MCP_PIXELS_JSON",
      fileEnv: "META_BUSINESS_MCP_PIXELS_FILE",
      idsEnv: "META_PIXEL_IDS",
      idKeys: ["id", "pixel_id"],
      arrayKey: "pixels"
    }),
    businesses: loadAssetAllowlist(env, {
      jsonEnv: "META_BUSINESS_MCP_BUSINESSES_JSON",
      fileEnv: "META_BUSINESS_MCP_BUSINESSES_FILE",
      idsEnv: "META_BUSINESS_IDS",
      idKeys: ["id", "business_id"],
      arrayKey: "businesses"
    }),
    requestTimeoutMs: parsePositiveInt(env.META_BUSINESS_MCP_TIMEOUT_MS, 20_000),
    storageDir: resolve(clean(env.META_BUSINESS_MCP_STORAGE_DIR) ?? ".meta-business-mcp"),
    writesEnabled: parseBoolean(env.META_BUSINESS_MCP_WRITES_ENABLED),
    maxBudgetChangePercent: parsePositiveNumber(env.META_BUSINESS_MCP_MAX_BUDGET_CHANGE_PERCENT, 25),
    httpAuth: {
      enabled: parseBoolean(env.META_BUSINESS_MCP_HTTP_AUTH_ENABLED),
      ...(authIssuer ? { issuer: authIssuer } : {}),
      ...(authAudience ? { audience: authAudience } : {}),
      ...(authJwksUrl ? { jwksUrl: authJwksUrl } : {}),
      requiredScopes: splitCsv(env.META_BUSINESS_MCP_AUTH_REQUIRED_SCOPES)
    }
  };
}
