import { createHash, randomUUID } from "node:crypto";
import { redactSecrets } from "@meta-business-mcp/audit";
import {
  assertAdAccountAllowed,
  MetaClientError,
  MetaReadClient,
  type FetchLike,
  type MetaObject,
  type PageResult
} from "@meta-business-mcp/meta-client";
import { defaultPolicy, isToolAllowed } from "@meta-business-mcp/policy";
import {
  createBudgetProposal,
  createDeliveryStatusProposal,
  createGenericProposal,
  hashProposalPayload,
  type Proposal
} from "@meta-business-mcp/proposals";
import {
  AdAccountsListInputSchema,
  AdCreativesListInputSchema,
  AdsInsightsQueryInputSchema,
  AdsListInputSchema,
  AdSetsListInputSchema,
  AllowedAssetsListInputSchema,
  BudgetProposalInputSchema,
  CampaignsListInputSchema,
  CommentReplyProposalInputSchema,
  ConnectionStatusInputSchema,
  CustomConversionsListInputSchema,
  DeliveryStatusProposalInputSchema,
  FetchInputSchema,
  InstagramAccountsListInputSchema,
  InstagramMediaInsightsInputSchema,
  InstagramMediaListInputSchema,
  LeadFormsListInputSchema,
  MessageReplyProposalInputSchema,
  PageConversationsListInputSchema,
  PageInsightsQueryInputSchema,
  PageMetadataInputSchema,
  PagePostCommentsListInputSchema,
  PagePostInsightsQueryInputSchema,
  PagePostProposalInputSchema,
  PagePostsListInputSchema,
  PagesListInputSchema,
  PermissionProbeInputSchema,
  PixelsListInputSchema,
  ProposalApprovalInputSchema,
  ProposalExecuteInputSchema,
  ProposalIdInputSchema,
  ProposalListInputSchema,
  SearchInputSchema,
  TokenHealthInputSchema,
  type SafeError,
  skeletonSafeError,
  ToolContracts,
  type ToolName
} from "@meta-business-mcp/schemas";
import { FileStore, type ProposalRecord, type StoredDocument } from "@meta-business-mcp/storage";
import { loadRuntimeConfig, type ConfiguredAsset, type RuntimeConfig } from "./config.js";

type Warning = {
  code: string;
  message: string;
};

type ResultEnvelope<T> = {
  data: T;
  meta: {
    request_id: string;
    as_of: string;
    meta_api_version: string;
    partial: boolean;
    next_cursor?: string;
    warnings: Warning[];
    data_classification: "business_confidential" | "personal" | "restricted";
  };
};

export type HandlerDependencies = {
  config?: RuntimeConfig;
  fetcher?: FetchLike | undefined;
  store?: FileStore | undefined;
};

class SafeToolError extends Error {
  readonly safeCode: SafeError["error"]["code"];
  readonly retryable: boolean;
  readonly remediation: string | undefined;

  constructor(
    safeCode: SafeError["error"]["code"],
    message: string,
    options: {
      retryable?: boolean;
      remediation?: string;
    } = {}
  ) {
    super(message);
    this.name = "SafeToolError";
    this.safeCode = safeCode;
    this.retryable = options.retryable ?? false;
    this.remediation = options.remediation;
  }
}

const LOCAL_CURSOR_PREFIX = "local:";
const TERMINAL_PROPOSAL_STATUSES = new Set([
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
  "SUCCEEDED",
  "FAILED",
  "RECONCILIATION_REQUIRED"
]);

function createClient(config: RuntimeConfig, fetcher?: FetchLike): MetaReadClient {
  return new MetaReadClient({
    ...(config.accessToken ? { accessToken: config.accessToken } : {}),
    apiVersion: config.apiVersion,
    requestTimeoutMs: config.requestTimeoutMs,
    ...(fetcher ? { fetcher } : {})
  });
}

function createStore(config: RuntimeConfig, store?: FileStore): FileStore {
  return store ?? new FileStore(config.storageDir);
}

function resultEnvelope<T>(
  data: T,
  config: RuntimeConfig,
  options: {
    partial?: boolean | undefined;
    nextCursor?: string | undefined;
    warnings?: Warning[] | undefined;
    dataClassification?: "business_confidential" | "personal" | "restricted" | undefined;
  } = {}
): ResultEnvelope<T> {
  return {
    data: redactSecrets(data),
    meta: {
      request_id: randomUUID(),
      as_of: new Date().toISOString(),
      meta_api_version: config.apiVersion,
      partial: options.partial ?? false,
      ...(options.nextCursor ? { next_cursor: options.nextCursor } : {}),
      warnings: options.warnings ?? [],
      data_classification: options.dataClassification ?? "business_confidential"
    }
  };
}

function safeError(
  code: SafeError["error"]["code"],
  safeMessage: string,
  options: {
    retryable?: boolean | undefined;
    retryAfterMs?: number | undefined;
    requiredCapability?: string | undefined;
    remediation?: string | undefined;
  } = {}
): SafeError {
  return redactSecrets({
    error: {
      code,
      safe_message: safeMessage,
      retryable: options.retryable ?? false,
      ...(options.retryAfterMs ? { retry_after_ms: options.retryAfterMs } : {}),
      ...(options.requiredCapability ? { required_capability: options.requiredCapability } : {}),
      ...(options.remediation ? { remediation: options.remediation } : {})
    }
  });
}

function toSafeError(error: unknown): SafeError {
  if (error instanceof SafeToolError) {
    return safeError(error.safeCode, error.message, {
      retryable: error.retryable,
      ...(error.remediation ? { remediation: error.remediation } : {})
    });
  }

  if (error instanceof MetaClientError) {
    return safeError(error.safeCode, error.message, {
      retryable: error.retryable,
      ...(error.retryAfterMs ? { retryAfterMs: error.retryAfterMs } : {}),
      ...(error.requiredCapability ? { requiredCapability: error.requiredCapability } : {}),
      remediation: remediationForCode(error.safeCode)
    });
  }

  if (error instanceof Error && error.name === "ZodError") {
    return safeError("INVALID_QUERY", "Tool input did not match the documented schema.", {
      remediation: "Check the tool reference and retry with only supported fields."
    });
  }

  return safeError("UPSTREAM_TRANSIENT", error instanceof Error ? error.message : "The Meta operation failed.", {
    retryable: true,
    remediation: "Retry later. If this persists, inspect server logs with secret redaction enabled."
  });
}

function remediationForCode(code: MetaClientError["safeCode"]): string {
  switch (code) {
    case "AUTH_REQUIRED":
      return "Set META_ADS_TOKEN for this MCP server process.";
    case "TOKEN_EXPIRED":
      return "Refresh the Meta token, then restart the MCP server.";
    case "INSUFFICIENT_SCOPE":
      return "Grant the token the required Meta permission for this asset.";
    case "ASSET_NOT_ALLOWED":
      return "Add the asset to the explicit allowlist.";
    case "INVALID_CURSOR":
      return "Retry from the first page instead of reusing this cursor.";
    case "RATE_LIMITED":
      return "Wait before retrying or reduce request frequency.";
    case "INVALID_QUERY":
      return "Adjust the query to the documented allowlisted fields and filters.";
    default:
      return "Retry later or check the configured Meta connection.";
  }
}

function safeCheckError(error: unknown): { code: string; safe_message: string } {
  const safe = toSafeError(error);
  return {
    code: safe.error.code,
    safe_message: safe.error.safe_message
  };
}

function validateDateRange(since: string, until: string): void {
  const sinceMs = Date.parse(`${since}T00:00:00.000Z`);
  const untilMs = Date.parse(`${until}T00:00:00.000Z`);
  if (!Number.isFinite(sinceMs) || !Number.isFinite(untilMs) || sinceMs > untilMs) {
    throw new MetaClientError("INVALID_QUERY", "Date ranges must have since on or before until.");
  }

  const days = Math.floor((untilMs - sinceMs) / 86_400_000) + 1;
  if (days > defaultPolicy.queries.max_date_range_days) {
    throw new MetaClientError(
      "INVALID_QUERY",
      `Date ranges must be ${defaultPolicy.queries.max_date_range_days} days or shorter.`
    );
  }
}

function validateOptionalDateRange(since: string | undefined, until: string | undefined): void {
  if (since && until) {
    validateDateRange(since, until);
  }
}

function localCursor(index: number): string {
  return `${LOCAL_CURSOR_PREFIX}${Buffer.from(String(index), "utf8").toString("base64url")}`;
}

function parseLocalCursor(cursor: string | undefined): number {
  if (!cursor) {
    return 0;
  }
  if (!cursor.startsWith(LOCAL_CURSOR_PREFIX)) {
    throw new MetaClientError("INVALID_CURSOR", "The pagination cursor is not valid for this local result set.");
  }
  const parsed = Number.parseInt(Buffer.from(cursor.slice(LOCAL_CURSOR_PREFIX.length), "base64url").toString("utf8"), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new MetaClientError("INVALID_CURSOR", "The local pagination cursor is malformed.");
  }
  return parsed;
}

function paginateLocal<T>(
  items: readonly T[],
  input: { limit?: number | undefined; after?: string | undefined }
): PageResult<T> {
  const limit = input.limit ?? defaultPolicy.queries.max_page_size;
  const start = parseLocalCursor(input.after);
  const page = items.slice(start, start + limit);
  const nextIndex = start + page.length;
  return {
    data: page,
    partial: nextIndex < items.length,
    ...(nextIndex < items.length ? { nextCursor: localCursor(nextIndex) } : {})
  };
}

function assertConfiguredAssetAllowed(
  assetId: string,
  allowlist: readonly ConfiguredAsset[],
  assetType: string
): ConfiguredAsset {
  if (allowlist.length === 0) {
    throw new MetaClientError(
      "ASSET_NOT_ALLOWED",
      `No ${assetType} allowlist is configured.`,
      { requiredCapability: `configured_${assetType}` }
    );
  }
  const asset = allowlist.find((candidate) => candidate.id === assetId);
  if (!asset) {
    throw new MetaClientError(
      "ASSET_NOT_ALLOWED",
      `The requested ${assetType} is not configured in the explicit allowlist.`,
      { requiredCapability: `configured_${assetType}` }
    );
  }
  return asset;
}

function assertPostParentPageAllowed(postId: string, config: RuntimeConfig): string {
  const [pageId] = postId.split("_");
  if (!pageId || pageId === postId) {
    throw new MetaClientError(
      "INVALID_QUERY",
      "Page post IDs must include the parent Page prefix in the {page_id}_{post_id} form."
    );
  }
  assertConfiguredAssetAllowed(pageId, config.pages, "page");
  return pageId;
}

function hashValue(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(redactSecrets(value))).digest("hex").slice(0, 24);
}

function stripSensitiveKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stripSensitiveKeys(item));
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !/token|secret|password|authorization/i.test(key))
      .map(([key, item]) => [key, stripSensitiveKeys(item)]);
    return Object.fromEntries(entries);
  }
  return value;
}

function sanitizeObject<T>(value: T): T {
  return redactSecrets(stripSensitiveKeys(value)) as T;
}

function sanitizeComment(comment: MetaObject): MetaObject {
  const sanitized = sanitizeObject(comment);
  if ("from" in sanitized) {
    return {
      ...sanitized,
      from: {
        redacted: true
      }
    };
  }
  return sanitized;
}

function sanitizeObjects(items: readonly MetaObject[]): MetaObject[] {
  return items.map((item) => sanitizeObject(item));
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function toSearchText(value: unknown): string {
  return JSON.stringify(sanitizeObject(value), null, 2).slice(0, defaultPolicy.content.max_text_length);
}

function documentTitle(sourceType: string, item: Record<string, unknown>): string {
  const name = stringValue(item.name) ?? stringValue(item.title) ?? stringValue(item.id) ?? hashValue(item);
  return `${sourceType}: ${name}`;
}

function cacheItems(
  store: FileStore,
  sourceType: string,
  assetId: string | undefined,
  items: readonly MetaObject[],
  options: {
    classification?: StoredDocument["data_classification"] | undefined;
    redactionStatus?: StoredDocument["redaction_status"] | undefined;
  } = {}
): void {
  const now = new Date().toISOString();
  for (const item of items) {
    const sanitized = sanitizeObject(item) as Record<string, unknown>;
    const sourceId = stringValue(sanitized.id) ?? hashValue(sanitized);
    store.upsertDocument({
      id: `meta:${sourceType}:${sourceId}`,
      title: documentTitle(sourceType, sanitized),
      source_type: sourceType,
      ...(assetId ? { asset_id: assetId } : {}),
      text: toSearchText(sanitized),
      structured: sanitized,
      created_at: now,
      updated_at: now,
      data_classification: options.classification ?? "business_confidential",
      redaction_status: options.redactionStatus ?? "redacted",
      provenance: {
        system: "meta_graph",
        source_id: sourceId
      }
    });
  }
}

function cacheSnapshot(
  store: FileStore,
  sourceType: string,
  assetId: string | undefined,
  title: string,
  structured: Record<string, unknown>,
  options: {
    classification?: StoredDocument["data_classification"] | undefined;
    redactionStatus?: StoredDocument["redaction_status"] | undefined;
  } = {}
): void {
  const now = new Date().toISOString();
  const sanitized = sanitizeObject(structured) as Record<string, unknown>;
  store.upsertDocument({
    id: `meta:${sourceType}:${hashValue(sanitized)}`,
    title,
    source_type: sourceType,
    ...(assetId ? { asset_id: assetId } : {}),
    text: toSearchText(sanitized),
    structured: sanitized,
    created_at: now,
    updated_at: now,
    data_classification: options.classification ?? "business_confidential",
    redaction_status: options.redactionStatus ?? "redacted",
    provenance: {
      system: "meta_graph"
    }
  });
}

function proposalToRecord(proposal: Proposal, status: ProposalRecord["status"] = "PENDING_APPROVAL"): ProposalRecord {
  return sanitizeObject({
    ...proposal,
    status,
    approvals: []
  }) as ProposalRecord;
}

function recordToProposalHashPayload(record: ProposalRecord): Omit<Proposal, "proposal_hash"> {
  return {
    proposal_id: record.proposal_id,
    status: record.status as Proposal["status"],
    action_type: record.action_type as Proposal["action_type"],
    target: record.target,
    before: record.before,
    proposed: record.proposed,
    reason: record.reason,
    risk_class: record.risk_class as Proposal["risk_class"],
    required_approvals: record.required_approvals,
    policy_version: record.policy_version,
    created_by: record.created_by,
    created_at: record.created_at,
    expires_at: record.expires_at
  };
}

function assertProposalIntegrity(record: ProposalRecord): void {
  const recomputed = hashProposalPayload(recordToProposalHashPayload(record));
  if (recomputed !== record.proposal_hash) {
    throw new SafeToolError("STALE_PROPOSAL", "The proposal hash no longer matches the stored proposal payload.", {
      remediation: "Fetch the proposal again and create a replacement proposal if needed."
    });
  }
}

function assertProposalNotExpired(record: ProposalRecord): void {
  if (Date.parse(record.expires_at) <= Date.now()) {
    throw new SafeToolError("APPROVAL_EXPIRED", "The proposal has expired.", {
      remediation: "Create a fresh proposal with the current before-state."
    });
  }
}

function saveProposalRecord(store: FileStore, record: ProposalRecord): ProposalRecord {
  const saved = store.saveProposal(sanitizeObject(record));
  cacheSnapshot(store, "proposal", saved.target.id, `proposal: ${saved.action_type} ${saved.target.id}`, saved, {
    redactionStatus: "redacted"
  });
  return saved;
}

function getProposalOrThrow(store: FileStore, proposalId: string): ProposalRecord {
  const proposal = store.getProposal(proposalId);
  if (!proposal) {
    throw new SafeToolError("DATA_UNAVAILABLE", "No proposal exists with that proposal_id.");
  }
  return proposal;
}

function numericMinorUnits(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && /^-?\d+$/.test(value)) {
    return Number.parseInt(value, 10);
  }
  return undefined;
}

function enforceBudgetCap(record: ProposalRecord, config: RuntimeConfig): void {
  const budgetType = record.proposed.budget_type;
  const amountMinor = numericMinorUnits(record.proposed.amount_minor);
  if ((budgetType !== "daily" && budgetType !== "lifetime") || amountMinor === undefined || amountMinor <= 0) {
    throw new SafeToolError("INVALID_QUERY", "Budget proposal has an invalid budget type or amount.");
  }

  const field = budgetType === "daily" ? "daily_budget" : "lifetime_budget";
  const previous = numericMinorUnits(record.before[field]);
  if (previous === undefined || previous <= 0) {
    throw new SafeToolError("PRECONDITION_FAILED", "Current budget was not captured, so the budget cap cannot be verified.", {
      remediation: "Create a fresh budget proposal after reading the current campaign or ad set."
    });
  }

  const percentChange = Math.abs(amountMinor - previous) / previous * 100;
  if (percentChange > config.maxBudgetChangePercent) {
    throw new SafeToolError("POLICY_DENIED", `Budget change exceeds the configured ${config.maxBudgetChangePercent}% cap.`, {
      remediation: "Create a smaller proposal or change META_BUSINESS_MCP_MAX_BUDGET_CHANGE_PERCENT in the private runtime."
    });
  }
}

async function fetchAdTargetBefore(
  client: MetaReadClient,
  adAccountId: string,
  targetType: "campaign" | "ad_set" | "ad",
  targetId: string
): Promise<Record<string, unknown>> {
  if (targetType === "campaign") {
    const page = await client.listCampaigns({ ad_account_id: adAccountId, limit: 100 });
    const match = page.data.find((item) => item.id === targetId);
    if (match) {
      return sanitizeObject({ ...match, ad_account_id: adAccountId }) as Record<string, unknown>;
    }
  }

  if (targetType === "ad_set") {
    const page = await client.listAdSets({ ad_account_id: adAccountId, limit: 100 });
    const match = page.data.find((item) => item.id === targetId);
    if (match) {
      return sanitizeObject({ ...match, ad_account_id: adAccountId }) as Record<string, unknown>;
    }
  }

  if (targetType === "ad") {
    const page = await client.listAds({ ad_account_id: adAccountId, limit: 100 });
    const match = page.data.find((item) => item.id === targetId);
    if (match) {
      return sanitizeObject({ ...match, ad_account_id: adAccountId }) as Record<string, unknown>;
    }
  }

  throw new MetaClientError(
    "DATA_UNAVAILABLE",
    "The target was not found in the allowlisted account. Read the target first or refine the proposal."
  );
}

function proposalActor(input: Record<string, unknown>): string {
  return stringValue(input.actor_id) ?? "mcp-client";
}

async function handleConnectionStatus(
  input: unknown,
  config: RuntimeConfig,
  client: MetaReadClient
): Promise<unknown> {
  ConnectionStatusInputSchema.parse(input);

  const checks: Array<Record<string, unknown>> = [
    {
      name: "token_present",
      ok: client.hasAccessToken()
    },
    {
      name: "ad_account_allowlist_present",
      ok: config.adAccounts.length > 0,
      configured_count: config.adAccounts.length
    },
    {
      name: "page_allowlist_present",
      ok: config.pages.length > 0,
      configured_count: config.pages.length
    }
  ];

  if (!client.hasAccessToken()) {
    return resultEnvelope({
      configured: false,
      state: "not_configured",
      api_version: config.apiVersion,
      allowed_assets: {
        ad_accounts: config.adAccounts.length,
        pages: config.pages.length,
        instagram_accounts: config.instagramAccounts.length,
        pixels: config.pixels.length,
        businesses: config.businesses.length
      },
      capabilities: {
        ads_read: false,
        pages_read: false,
        instagram_read: false,
        writes: false,
        raw_leads: false
      },
      checks
    }, config);
  }

  let tokenValid = false;
  let tokenData: Record<string, unknown> = {};

  try {
    await client.getPrincipal();
    checks.push({ name: "me", ok: true });
  } catch (error: unknown) {
    checks.push({ name: "me", ok: false, error: safeCheckError(error) });
  }

  try {
    const debug = await client.debugToken();
    tokenValid = debug.is_valid === true;
    tokenData = {
      valid: tokenValid,
      ...(debug.type ? { type: debug.type } : {}),
      ...(debug.scopes ? { scopes: debug.scopes } : {}),
      ...client.tokenTimestamps(debug)
    };
    checks.push({ name: "debug_token", ok: tokenValid });
  } catch (error: unknown) {
    checks.push({ name: "debug_token", ok: false, error: safeCheckError(error) });
    tokenData = { valid: false };
  }

  const adAccountChecks: Array<Record<string, unknown>> = [];
  for (const configured of config.adAccounts) {
    try {
      await client.getAdAccount(configured.id, configured);
      adAccountChecks.push({ id: configured.id, ok: true });
    } catch (error: unknown) {
      adAccountChecks.push({ id: configured.id, ok: false, error: safeCheckError(error) });
    }
  }
  if (adAccountChecks.length > 0) {
    checks.push({
      name: "configured_ad_accounts",
      ok: adAccountChecks.every((check) => check.ok === true),
      accounts: adAccountChecks
    });
  }

  const pageChecks: Array<Record<string, unknown>> = [];
  for (const page of config.pages) {
    try {
      await client.getPage(page.id);
      pageChecks.push({ id: page.id, ok: true });
    } catch (error: unknown) {
      pageChecks.push({ id: page.id, ok: false, error: safeCheckError(error) });
    }
  }
  if (pageChecks.length > 0) {
    checks.push({
      name: "configured_pages",
      ok: pageChecks.every((check) => check.ok === true),
      pages: pageChecks
    });
  }

  const adAccountAccessOk = adAccountChecks.length > 0 && adAccountChecks.every((check) => check.ok === true);
  const pageAccessOk = pageChecks.length > 0 && pageChecks.every((check) => check.ok === true);
  const state = tokenValid && (adAccountAccessOk || pageAccessOk)
    ? "valid"
    : tokenValid
      ? "degraded"
      : "invalid";

  return resultEnvelope({
    configured: true,
    state,
    api_version: config.apiVersion,
    allowed_assets: {
      ad_accounts: config.adAccounts.length,
      pages: config.pages.length,
      instagram_accounts: config.instagramAccounts.length,
      pixels: config.pixels.length,
      businesses: config.businesses.length
    },
    auth: tokenData,
    capabilities: {
      ads_read: tokenValid && adAccountAccessOk,
      pages_read: tokenValid && pageAccessOk,
      instagram_read: tokenValid && config.instagramAccounts.length > 0,
      proposal_drafts: true,
      writes: config.writesEnabled,
      raw_leads: false
    },
    checks
  }, config, {
    warnings: [
      ...(config.adAccounts.length === 0 ? [{ code: "NO_AD_ACCOUNT_ALLOWLIST", message: "No ad accounts are configured in the explicit allowlist." }] : []),
      ...(config.pages.length === 0 ? [{ code: "NO_PAGE_ALLOWLIST", message: "No Pages are configured in the explicit allowlist." }] : [])
    ]
  });
}

async function handleAdAccountsList(
  input: unknown,
  config: RuntimeConfig,
  client: MetaReadClient,
  store: FileStore
): Promise<unknown> {
  const parsed = AdAccountsListInputSchema.parse(input);
  if (config.adAccounts.length === 0) {
    return resultEnvelope({ accounts: [], configured_count: 0 }, config, {
      warnings: [{ code: "NO_AD_ACCOUNT_ALLOWLIST", message: "No ad accounts are configured in the explicit allowlist." }]
    });
  }

  const page = await client.listAllowedAdAccounts(config.adAccounts, parsed);
  const accounts = sanitizeObjects(page.data);
  cacheItems(store, "ad_account", undefined, accounts);
  return resultEnvelope({ accounts, configured_count: config.adAccounts.length }, config, {
    partial: page.partial,
    nextCursor: page.nextCursor
  });
}

async function handleCampaignsList(input: unknown, config: RuntimeConfig, client: MetaReadClient, store: FileStore): Promise<unknown> {
  const parsed = CampaignsListInputSchema.parse(input);
  const configured = assertAdAccountAllowed(parsed.ad_account_id, config.adAccounts);
  const page = await client.listCampaigns({ ...parsed, ad_account_id: configured.id });
  const campaigns = sanitizeObjects(page.data as MetaObject[]);
  cacheItems(store, "campaign", configured.id, campaigns);
  return resultEnvelope({ ad_account_id: configured.id, campaigns }, config, {
    partial: page.partial,
    nextCursor: page.nextCursor
  });
}

async function handleAdSetsList(input: unknown, config: RuntimeConfig, client: MetaReadClient, store: FileStore): Promise<unknown> {
  const parsed = AdSetsListInputSchema.parse(input);
  const configured = assertAdAccountAllowed(parsed.ad_account_id, config.adAccounts);
  const page = await client.listAdSets({ ...parsed, ad_account_id: configured.id });
  const adsets = sanitizeObjects(page.data);
  cacheItems(store, "ad_set", configured.id, adsets);
  return resultEnvelope({ ad_account_id: configured.id, adsets }, config, {
    partial: page.partial,
    nextCursor: page.nextCursor
  });
}

async function handleAdsList(input: unknown, config: RuntimeConfig, client: MetaReadClient, store: FileStore): Promise<unknown> {
  const parsed = AdsListInputSchema.parse(input);
  const configured = assertAdAccountAllowed(parsed.ad_account_id, config.adAccounts);
  const page = await client.listAds({ ...parsed, ad_account_id: configured.id });
  const ads = sanitizeObjects(page.data);
  cacheItems(store, "ad", configured.id, ads);
  return resultEnvelope({ ad_account_id: configured.id, ads }, config, {
    partial: page.partial,
    nextCursor: page.nextCursor
  });
}

async function handleAdCreativesList(input: unknown, config: RuntimeConfig, client: MetaReadClient, store: FileStore): Promise<unknown> {
  const parsed = AdCreativesListInputSchema.parse(input);
  const configured = assertAdAccountAllowed(parsed.ad_account_id, config.adAccounts);
  const page = await client.listAdCreatives({ ...parsed, ad_account_id: configured.id });
  const creatives = sanitizeObjects(page.data);
  cacheItems(store, "creative", configured.id, creatives);
  return resultEnvelope({ ad_account_id: configured.id, creatives }, config, {
    partial: page.partial,
    nextCursor: page.nextCursor
  });
}

async function handlePixelsList(input: unknown, config: RuntimeConfig, client: MetaReadClient, store: FileStore): Promise<unknown> {
  const parsed = PixelsListInputSchema.parse(input);
  const configured = assertAdAccountAllowed(parsed.ad_account_id, config.adAccounts);
  if (config.pixels.length === 0) {
    return resultEnvelope({ ad_account_id: configured.id, pixels: [], configured_count: 0 }, config, {
      warnings: [{ code: "NO_PIXEL_ALLOWLIST", message: "No pixels are configured in the explicit allowlist." }]
    });
  }
  const page = await client.listPixels({ ...parsed, ad_account_id: configured.id });
  const allowedIds = new Set(config.pixels.map((pixel) => pixel.id));
  const pixels = sanitizeObjects(page.data.filter((pixel) => pixel.id && allowedIds.has(pixel.id)));
  cacheItems(store, "context", configured.id, pixels);
  return resultEnvelope({ ad_account_id: configured.id, pixels, configured_count: config.pixels.length }, config, {
    partial: page.partial,
    nextCursor: page.nextCursor
  });
}

async function handleCustomConversionsList(input: unknown, config: RuntimeConfig, client: MetaReadClient, store: FileStore): Promise<unknown> {
  const parsed = CustomConversionsListInputSchema.parse(input);
  const configured = assertAdAccountAllowed(parsed.ad_account_id, config.adAccounts);
  const page = await client.listCustomConversions({ ...parsed, ad_account_id: configured.id });
  const customConversions = sanitizeObjects(page.data);
  cacheItems(store, "context", configured.id, customConversions);
  return resultEnvelope({ ad_account_id: configured.id, custom_conversions: customConversions }, config, {
    partial: page.partial,
    nextCursor: page.nextCursor
  });
}

async function handleAdsInsightsQuery(input: unknown, config: RuntimeConfig, client: MetaReadClient, store: FileStore): Promise<unknown> {
  const parsed = AdsInsightsQueryInputSchema.parse(input);
  validateDateRange(parsed.time_range.since, parsed.time_range.until);

  const configured = assertAdAccountAllowed(parsed.ad_account_id, config.adAccounts);
  const page = await client.queryInsights({ ...parsed, ad_account_id: configured.id });
  const rows = sanitizeObjects(page.data as MetaObject[]);
  cacheSnapshot(store, "insights", configured.id, `ads insights ${configured.id} ${parsed.level}`, {
    ad_account_id: configured.id,
    level: parsed.level,
    time_range: parsed.time_range,
    metrics: parsed.metrics,
    breakdowns: parsed.breakdowns ?? [],
    rows
  });
  return resultEnvelope({
    ad_account_id: configured.id,
    level: parsed.level,
    time_range: parsed.time_range,
    metrics: parsed.metrics,
    breakdowns: parsed.breakdowns ?? [],
    rows
  }, config, {
    partial: page.partial,
    nextCursor: page.nextCursor
  });
}

async function handlePagesList(input: unknown, config: RuntimeConfig, client: MetaReadClient, store: FileStore): Promise<unknown> {
  const parsed = PagesListInputSchema.parse(input);
  if (config.pages.length === 0) {
    return resultEnvelope({ pages: [], configured_count: 0 }, config, {
      warnings: [{ code: "NO_PAGE_ALLOWLIST", message: "No Pages are configured in the explicit allowlist." }]
    });
  }

  const localPage = paginateLocal(config.pages, parsed);
  const pages: MetaObject[] = [];
  const errors: Array<Record<string, unknown>> = [];
  for (const configured of localPage.data) {
    try {
      const page = await client.getPage(configured.id);
      pages.push(sanitizeObject({
        ...page,
        configured_name: configured.name,
        configured_alias: configured.alias
      }) as MetaObject);
    } catch (error: unknown) {
      errors.push({ id: configured.id, error: safeCheckError(error) });
    }
  }

  cacheItems(store, "page", undefined, pages);
  return resultEnvelope({ pages, configured_count: config.pages.length, errors }, config, {
    partial: localPage.partial,
    nextCursor: localPage.nextCursor
  });
}

async function handlePageGet(input: unknown, config: RuntimeConfig, client: MetaReadClient, store: FileStore): Promise<unknown> {
  const parsed = PageMetadataInputSchema.parse(input);
  assertConfiguredAssetAllowed(parsed.page_id, config.pages, "page");
  const page = sanitizeObject(await client.getPage(parsed.page_id)) as MetaObject;
  cacheItems(store, "page", parsed.page_id, [page]);
  return resultEnvelope({ page }, config);
}

async function handlePagePostsList(input: unknown, config: RuntimeConfig, client: MetaReadClient, store: FileStore): Promise<unknown> {
  const parsed = PagePostsListInputSchema.parse(input);
  assertConfiguredAssetAllowed(parsed.page_id, config.pages, "page");
  const page = await client.listPagePosts(parsed);
  const posts = sanitizeObjects(page.data);
  cacheItems(store, "page_post", parsed.page_id, posts);
  return resultEnvelope({ page_id: parsed.page_id, posts }, config, {
    partial: page.partial,
    nextCursor: page.nextCursor
  });
}

async function handlePagePostCommentsList(input: unknown, config: RuntimeConfig, client: MetaReadClient, store: FileStore): Promise<unknown> {
  const parsed = PagePostCommentsListInputSchema.parse(input);
  const pageId = assertPostParentPageAllowed(parsed.post_id, config);
  const page = await client.listPagePostComments({ ...parsed, page_id: pageId });
  const comments = page.data.map((comment) => sanitizeComment(comment));
  cacheItems(store, "page_comment", pageId, comments, {
    classification: "personal",
    redactionStatus: "masked"
  });
  return resultEnvelope({ post_id: parsed.post_id, comments }, config, {
    partial: page.partial,
    nextCursor: page.nextCursor,
    dataClassification: "personal"
  });
}

async function handlePageInsightsQuery(input: unknown, config: RuntimeConfig, client: MetaReadClient, store: FileStore): Promise<unknown> {
  const parsed = PageInsightsQueryInputSchema.parse(input);
  assertConfiguredAssetAllowed(parsed.page_id, config.pages, "page");
  validateOptionalDateRange(parsed.since, parsed.until);
  const page = await client.queryPageInsights(parsed);
  const rows = sanitizeObjects(page.data);
  cacheSnapshot(store, "insights", parsed.page_id, `page insights ${parsed.page_id}`, {
    page_id: parsed.page_id,
    metrics: parsed.metrics,
    period: parsed.period,
    rows
  });
  return resultEnvelope({ page_id: parsed.page_id, metrics: parsed.metrics, rows }, config, {
    partial: page.partial,
    nextCursor: page.nextCursor
  });
}

async function handlePagePostInsightsQuery(input: unknown, config: RuntimeConfig, client: MetaReadClient, store: FileStore): Promise<unknown> {
  const parsed = PagePostInsightsQueryInputSchema.parse(input);
  const pageId = assertPostParentPageAllowed(parsed.post_id, config);
  const page = await client.queryPagePostInsights({ ...parsed, page_id: pageId });
  const rows = sanitizeObjects(page.data);
  cacheSnapshot(store, "insights", pageId, `page post insights ${parsed.post_id}`, {
    post_id: parsed.post_id,
    metrics: parsed.metrics,
    rows
  });
  return resultEnvelope({ post_id: parsed.post_id, metrics: parsed.metrics, rows }, config, {
    partial: page.partial,
    nextCursor: page.nextCursor
  });
}

async function handlePageConversationsList(input: unknown, config: RuntimeConfig, client: MetaReadClient, store: FileStore): Promise<unknown> {
  const parsed = PageConversationsListInputSchema.parse(input);
  assertConfiguredAssetAllowed(parsed.page_id, config.pages, "page");
  const page = await client.listPageConversations(parsed);
  const conversations = sanitizeObjects(page.data);
  cacheItems(store, "context", parsed.page_id, conversations, {
    classification: "personal",
    redactionStatus: "metadata_only"
  });
  return resultEnvelope({ page_id: parsed.page_id, conversations }, config, {
    partial: page.partial,
    nextCursor: page.nextCursor,
    dataClassification: "personal"
  });
}

async function handleInstagramAccountsList(input: unknown, config: RuntimeConfig, client: MetaReadClient, store: FileStore): Promise<unknown> {
  const parsed = InstagramAccountsListInputSchema.parse(input);
  const pages = parsed.page_id
    ? [assertConfiguredAssetAllowed(parsed.page_id, config.pages, "page")]
    : config.pages;
  if (pages.length === 0) {
    return resultEnvelope({ instagram_accounts: [], configured_count: config.instagramAccounts.length }, config, {
      warnings: [{ code: "NO_PAGE_ALLOWLIST", message: "No Pages are configured for Instagram account discovery." }]
    });
  }

  const allowedIgIds = new Set(config.instagramAccounts.map((account) => account.id));
  const accounts: MetaObject[] = [];
  const errors: Array<Record<string, unknown>> = [];
  for (const page of pages) {
    try {
      const response = await client.listInstagramAccounts({ page_id: page.id });
      const linked = response.instagram_business_account;
      if (linked && typeof linked === "object") {
        const linkedAccount = sanitizeObject({
          ...(linked as Record<string, unknown>),
          page_id: page.id,
          configured: typeof (linked as { id?: unknown }).id === "string" && allowedIgIds.has((linked as { id: string }).id)
        }) as MetaObject;
        if (config.instagramAccounts.length === 0 || linkedAccount.configured === true) {
          accounts.push(linkedAccount);
        }
      }
    } catch (error: unknown) {
      errors.push({ page_id: page.id, error: safeCheckError(error) });
    }
  }

  cacheItems(store, "instagram_account", undefined, accounts);
  return resultEnvelope({ instagram_accounts: accounts, configured_count: config.instagramAccounts.length, errors }, config);
}

async function handleInstagramMediaList(input: unknown, config: RuntimeConfig, client: MetaReadClient, store: FileStore): Promise<unknown> {
  const parsed = InstagramMediaListInputSchema.parse(input);
  assertConfiguredAssetAllowed(parsed.instagram_account_id, config.instagramAccounts, "instagram_account");
  const page = await client.listInstagramMedia(parsed);
  const media = sanitizeObjects(page.data);
  cacheItems(store, "instagram_media", parsed.instagram_account_id, media, {
    redactionStatus: "masked"
  });
  return resultEnvelope({ instagram_account_id: parsed.instagram_account_id, media }, config, {
    partial: page.partial,
    nextCursor: page.nextCursor
  });
}

async function handleInstagramMediaInsightsQuery(input: unknown, config: RuntimeConfig, client: MetaReadClient, store: FileStore): Promise<unknown> {
  const parsed = InstagramMediaInsightsInputSchema.parse(input);
  assertConfiguredAssetAllowed(parsed.instagram_account_id, config.instagramAccounts, "instagram_account");
  const page = await client.queryInstagramMediaInsights(parsed);
  const rows = sanitizeObjects(page.data);
  cacheSnapshot(store, "insights", parsed.instagram_account_id, `instagram media insights ${parsed.media_id}`, {
    instagram_account_id: parsed.instagram_account_id,
    media_id: parsed.media_id,
    metrics: parsed.metrics,
    rows
  });
  return resultEnvelope({ instagram_account_id: parsed.instagram_account_id, media_id: parsed.media_id, metrics: parsed.metrics, rows }, config, {
    partial: page.partial,
    nextCursor: page.nextCursor
  });
}

async function handleLeadFormsList(input: unknown, config: RuntimeConfig, client: MetaReadClient, store: FileStore): Promise<unknown> {
  const parsed = LeadFormsListInputSchema.parse(input);
  assertConfiguredAssetAllowed(parsed.page_id, config.pages, "page");
  const page = await client.listLeadForms(parsed);
  const forms = sanitizeObjects(page.data);
  cacheItems(store, "lead_form", parsed.page_id, forms, {
    redactionStatus: "metadata_only"
  });
  return resultEnvelope({
    page_id: parsed.page_id,
    lead_forms: forms,
    raw_leads_enabled: false
  }, config, {
    partial: page.partial,
    nextCursor: page.nextCursor
  });
}

async function handleAllowedAssetsList(input: unknown, config: RuntimeConfig): Promise<unknown> {
  AllowedAssetsListInputSchema.parse(input);
  return resultEnvelope({
    ad_accounts: config.adAccounts,
    pages: config.pages,
    instagram_accounts: config.instagramAccounts,
    pixels: config.pixels,
    businesses: config.businesses,
    boundaries: {
      explicit_allowlists_required: defaultPolicy.assets.require_explicit_allowlist,
      arbitrary_graph_request: false,
      raw_leads: false,
      writes_enabled: config.writesEnabled,
      max_budget_change_percent: config.maxBudgetChangePercent
    }
  }, config);
}

async function handleTokenHealthCheck(input: unknown, config: RuntimeConfig, client: MetaReadClient): Promise<unknown> {
  TokenHealthInputSchema.parse(input);
  const checks: Array<Record<string, unknown>> = [];
  let debug: Record<string, unknown> = { valid: false };

  try {
    const principal = await client.getPrincipal();
    checks.push({ name: "me", ok: true, principal: sanitizeObject(principal) });
  } catch (error: unknown) {
    checks.push({ name: "me", ok: false, error: safeCheckError(error) });
  }

  try {
    const token = await client.debugToken();
    debug = {
      valid: token.is_valid === true,
      ...(token.type ? { type: token.type } : {}),
      ...(token.scopes ? { scopes: token.scopes } : {}),
      ...client.tokenTimestamps(token)
    };
    checks.push({ name: "debug_token", ok: token.is_valid === true });
  } catch (error: unknown) {
    checks.push({ name: "debug_token", ok: false, error: safeCheckError(error) });
  }

  return resultEnvelope({ auth: debug, checks }, config);
}

async function handlePermissionProbe(input: unknown, config: RuntimeConfig, client: MetaReadClient): Promise<unknown> {
  PermissionProbeInputSchema.parse(input);
  const probes: Array<Record<string, unknown>> = [];

  for (const account of config.adAccounts.slice(0, 5)) {
    try {
      await client.getAdAccount(account.id, account);
      probes.push({ capability: "ads_read", asset_type: "ad_account", asset_id: account.id, ok: true });
    } catch (error: unknown) {
      probes.push({ capability: "ads_read", asset_type: "ad_account", asset_id: account.id, ok: false, error: safeCheckError(error) });
    }
  }

  for (const page of config.pages.slice(0, 5)) {
    try {
      await client.getPage(page.id);
      probes.push({ capability: "pages_read", asset_type: "page", asset_id: page.id, ok: true });
    } catch (error: unknown) {
      probes.push({ capability: "pages_read", asset_type: "page", asset_id: page.id, ok: false, error: safeCheckError(error) });
    }
  }

  const firstPage = config.pages[0];
  if (firstPage) {
    try {
      await client.listInstagramAccounts({ page_id: firstPage.id });
      probes.push({ capability: "instagram_read", asset_type: "page", asset_id: firstPage.id, ok: true });
    } catch (error: unknown) {
      probes.push({ capability: "instagram_read", asset_type: "page", asset_id: firstPage.id, ok: false, error: safeCheckError(error) });
    }
  }

  if (firstPage) {
    try {
      await client.listLeadForms({ page_id: firstPage.id, limit: 1 });
      probes.push({ capability: "lead_form_metadata", asset_type: "page", asset_id: firstPage.id, ok: true });
    } catch (error: unknown) {
      probes.push({ capability: "lead_form_metadata", asset_type: "page", asset_id: firstPage.id, ok: false, error: safeCheckError(error) });
    }
  }

  return resultEnvelope({
    probes,
    summary: {
      ok: probes.filter((probe) => probe.ok === true).length,
      failed: probes.filter((probe) => probe.ok === false).length
    }
  }, config);
}

async function handleSearch(input: unknown, config: RuntimeConfig, store: FileStore): Promise<unknown> {
  const parsed = SearchInputSchema.parse(input);
  const filters = parsed.filters
    ? {
        ...(parsed.filters.source_types ? { source_types: parsed.filters.source_types } : {}),
        ...(parsed.filters.asset_ids ? { asset_ids: parsed.filters.asset_ids } : {}),
        ...(parsed.filters.since ? { since: parsed.filters.since } : {}),
        ...(parsed.filters.until ? { until: parsed.filters.until } : {})
      }
    : undefined;
  const results = store.searchDocuments(parsed.query, filters, parsed.limit ?? 20)
    .map((document) => ({
      id: document.id,
      title: document.title,
      source_type: document.source_type,
      asset_id: document.asset_id,
      updated_at: document.updated_at,
      data_classification: document.data_classification,
      redaction_status: document.redaction_status,
      snippet: document.text.slice(0, 500)
    }));
  return resultEnvelope({ results }, config);
}

async function handleFetch(input: unknown, config: RuntimeConfig, store: FileStore): Promise<unknown> {
  const parsed = FetchInputSchema.parse(input);
  const document = store.fetchDocument(parsed.id);
  if (!document) {
    throw new SafeToolError("DATA_UNAVAILABLE", "No sanitized document exists with that id.");
  }
  return resultEnvelope({ document }, config, {
    dataClassification: document.data_classification
  });
}

async function handleCreateBudgetProposal(input: unknown, config: RuntimeConfig, client: MetaReadClient, store: FileStore): Promise<unknown> {
  const parsed = BudgetProposalInputSchema.parse(input);
  const configured = assertAdAccountAllowed(parsed.ad_account_id, config.adAccounts);
  const before = await fetchAdTargetBefore(client, configured.id, parsed.target_type, parsed.target_id);
  const proposal = createBudgetProposal({
    proposal_id: randomUUID(),
    created_by: proposalActor(input as Record<string, unknown>),
    policy_version: defaultPolicy.policy_version,
    now: new Date(),
    before,
    request: { ...parsed, ad_account_id: configured.id }
  });
  const record = proposalToRecord(proposal, "PENDING_APPROVAL");
  const saved = saveProposalRecord(store, record);
  return resultEnvelope({ proposal: saved }, config);
}

async function handleCreateDeliveryStatusProposal(input: unknown, config: RuntimeConfig, client: MetaReadClient, store: FileStore): Promise<unknown> {
  const parsed = DeliveryStatusProposalInputSchema.parse(input);
  const configured = assertAdAccountAllowed(parsed.ad_account_id, config.adAccounts);
  const before = await fetchAdTargetBefore(client, configured.id, parsed.target_type, parsed.target_id);
  const proposal = createDeliveryStatusProposal({
    proposal_id: randomUUID(),
    created_by: proposalActor(input as Record<string, unknown>),
    policy_version: defaultPolicy.policy_version,
    now: new Date(),
    before,
    request: { ...parsed, ad_account_id: configured.id }
  });
  const record = proposalToRecord(proposal, "PENDING_APPROVAL");
  const saved = saveProposalRecord(store, record);
  return resultEnvelope({ proposal: saved }, config);
}

async function handleCreatePagePostProposal(input: unknown, config: RuntimeConfig, client: MetaReadClient, store: FileStore): Promise<unknown> {
  const parsed = PagePostProposalInputSchema.parse(input);
  assertConfiguredAssetAllowed(parsed.page_id, config.pages, "page");
  const before = sanitizeObject(await client.getPage(parsed.page_id)) as Record<string, unknown>;
  const proposal = createGenericProposal({
    proposal_id: randomUUID(),
    created_by: proposalActor(input as Record<string, unknown>),
    policy_version: defaultPolicy.policy_version,
    now: new Date(),
    action_type: "page_post.publish",
    target: { type: "page", id: parsed.page_id },
    before,
    proposed: {
      page_id: parsed.page_id,
      message: parsed.message,
      ...(parsed.link ? { link: parsed.link } : {}),
      ...(parsed.scheduled_publish_time ? { scheduled_publish_time: parsed.scheduled_publish_time } : {})
    },
    reason: parsed.reason,
    risk_class: "public",
    required_approvals: 2,
    expires_in_seconds: parsed.expires_in_seconds
  });
  const saved = saveProposalRecord(store, proposalToRecord(proposal, "PENDING_APPROVAL"));
  return resultEnvelope({ proposal: saved }, config);
}

async function handleCreateCommentReplyProposal(input: unknown, config: RuntimeConfig, store: FileStore): Promise<unknown> {
  const parsed = CommentReplyProposalInputSchema.parse(input);
  assertConfiguredAssetAllowed(parsed.page_id, config.pages, "page");
  const proposal = createGenericProposal({
    proposal_id: randomUUID(),
    created_by: proposalActor(input as Record<string, unknown>),
    policy_version: defaultPolicy.policy_version,
    now: new Date(),
    action_type: "comment.reply",
    target: { type: "comment", id: parsed.comment_id },
    before: {
      page_id: parsed.page_id,
      comment_id: parsed.comment_id,
      raw_comment_body_cached: false
    },
    proposed: {
      page_id: parsed.page_id,
      comment_id: parsed.comment_id,
      message: parsed.message
    },
    reason: parsed.reason,
    risk_class: "public",
    required_approvals: 1,
    expires_in_seconds: parsed.expires_in_seconds
  });
  const saved = saveProposalRecord(store, proposalToRecord(proposal, "PENDING_APPROVAL"));
  return resultEnvelope({ proposal: saved }, config);
}

async function handleCreateMessageReplyProposal(input: unknown, config: RuntimeConfig, store: FileStore): Promise<unknown> {
  const parsed = MessageReplyProposalInputSchema.parse(input);
  assertConfiguredAssetAllowed(parsed.page_id, config.pages, "page");
  const proposal = createGenericProposal({
    proposal_id: randomUUID(),
    created_by: proposalActor(input as Record<string, unknown>),
    policy_version: defaultPolicy.policy_version,
    now: new Date(),
    action_type: "message.reply",
    target: { type: "message_recipient", id: parsed.recipient_id },
    before: {
      page_id: parsed.page_id,
      recipient_id: parsed.recipient_id,
      message_body_cached: false
    },
    proposed: {
      page_id: parsed.page_id,
      recipient_id: parsed.recipient_id,
      message: parsed.message
    },
    reason: parsed.reason,
    risk_class: "operational",
    required_approvals: 1,
    expires_in_seconds: parsed.expires_in_seconds
  });
  const saved = saveProposalRecord(store, proposalToRecord(proposal, "PENDING_APPROVAL"));
  return resultEnvelope({ proposal: saved }, config, {
    dataClassification: "personal"
  });
}

async function handleProposalsList(input: unknown, config: RuntimeConfig, store: FileStore): Promise<unknown> {
  const parsed = ProposalListInputSchema.parse(input);
  const proposals = store.listProposals(parsed.limit ?? 50)
    .filter((proposal) => !parsed.status || proposal.status === parsed.status);
  return resultEnvelope({ proposals }, config);
}

async function handleProposalGet(input: unknown, config: RuntimeConfig, store: FileStore): Promise<unknown> {
  const parsed = ProposalIdInputSchema.parse(input);
  const proposal = getProposalOrThrow(store, parsed.proposal_id);
  return resultEnvelope({ proposal }, config);
}

async function handleProposalCancel(input: unknown, config: RuntimeConfig, store: FileStore): Promise<unknown> {
  const parsed = ProposalIdInputSchema.parse(input);
  const proposal = getProposalOrThrow(store, parsed.proposal_id);
  if (TERMINAL_PROPOSAL_STATUSES.has(proposal.status)) {
    throw new SafeToolError("PRECONDITION_FAILED", "Terminal proposals cannot be cancelled.");
  }
  const saved = saveProposalRecord(store, {
    ...proposal,
    status: "CANCELLED"
  });
  return resultEnvelope({ proposal: saved }, config);
}

async function handleProposalApprove(input: unknown, config: RuntimeConfig, store: FileStore): Promise<unknown> {
  const parsed = ProposalApprovalInputSchema.parse(input);
  const proposal = getProposalOrThrow(store, parsed.proposal_id);
  assertProposalIntegrity(proposal);
  assertProposalNotExpired(proposal);
  if (TERMINAL_PROPOSAL_STATUSES.has(proposal.status) || proposal.status === "EXECUTING") {
    throw new SafeToolError("PRECONDITION_FAILED", "Only pending proposals can be approved.");
  }
  if (proposal.proposal_hash !== parsed.proposal_hash) {
    throw new SafeToolError("STALE_PROPOSAL", "The supplied proposal_hash does not match the proposal.", {
      remediation: "Fetch the proposal and approve exactly the current hash."
    });
  }
  const approvals = proposal.approvals.some((approval) => approval.approver_id === parsed.approver_id)
    ? proposal.approvals
    : [
        ...proposal.approvals,
        {
          approver_id: parsed.approver_id,
          approved_at: new Date().toISOString(),
          proposal_hash: parsed.proposal_hash
        }
      ];
  const saved = saveProposalRecord(store, {
    ...proposal,
    approvals,
    status: approvals.length >= proposal.required_approvals ? "APPROVED" : "PENDING_APPROVAL"
  });
  return resultEnvelope({ proposal: saved }, config);
}

async function handleProposalExecute(input: unknown, config: RuntimeConfig, client: MetaReadClient, store: FileStore): Promise<unknown> {
  const parsed = ProposalExecuteInputSchema.parse(input);
  if (!config.writesEnabled) {
    throw new SafeToolError("POLICY_DENIED", "Meta writes are disabled for this server process.", {
      remediation: "Set META_BUSINESS_MCP_WRITES_ENABLED=1 only in a private reviewed runtime."
    });
  }

  const proposal = getProposalOrThrow(store, parsed.proposal_id);
  assertProposalIntegrity(proposal);
  assertProposalNotExpired(proposal);
  if (proposal.status !== "APPROVED") {
    throw new SafeToolError("APPROVAL_REQUIRED", "Proposal execution requires APPROVED status.");
  }
  if (proposal.approvals.length < proposal.required_approvals) {
    throw new SafeToolError("APPROVAL_REQUIRED", "Proposal does not have enough approvals.");
  }

  const executing = saveProposalRecord(store, { ...proposal, status: "EXECUTING" });
  const executedAt = new Date().toISOString();
  try {
    let providerResponse: MetaObject;
    switch (executing.action_type) {
      case "ads.delivery_status.set":
        providerResponse = await client.setDeliveryStatus({
          object_id: executing.target.id,
          status: executing.proposed.status as "ACTIVE" | "PAUSED"
        });
        break;
      case "ads.budget.set":
        enforceBudgetCap(executing, config);
        providerResponse = await client.setBudget({
          object_id: executing.target.id,
          budget_type: executing.proposed.budget_type as "daily" | "lifetime",
          amount_minor: String(executing.proposed.amount_minor)
        });
        break;
      case "page_post.publish":
        providerResponse = await client.publishPagePost({
          page_id: String(executing.proposed.page_id),
          message: String(executing.proposed.message),
          ...(typeof executing.proposed.link === "string" ? { link: executing.proposed.link } : {}),
          ...(typeof executing.proposed.scheduled_publish_time === "string" ? { scheduled_publish_time: executing.proposed.scheduled_publish_time } : {})
        });
        break;
      case "comment.reply":
        providerResponse = await client.replyToComment({
          page_id: String(executing.proposed.page_id),
          comment_id: executing.target.id,
          message: String(executing.proposed.message)
        });
        break;
      case "message.reply":
        providerResponse = await client.replyToMessage({
          page_id: String(executing.proposed.page_id),
          recipient_id: String(executing.proposed.recipient_id),
          message: String(executing.proposed.message)
        });
        break;
      default:
        throw new SafeToolError("POLICY_DENIED", "Unsupported proposal action type.");
    }

    const receipt = sanitizeObject({
      proposal_id: executing.proposal_id,
      action_type: executing.action_type,
      target: executing.target,
      executed_by: parsed.executor_id,
      executed_at: executedAt,
      provider_response: providerResponse,
      status: "SUCCEEDED"
    }) as Record<string, unknown>;
    const saved = saveProposalRecord(store, {
      ...executing,
      status: "SUCCEEDED",
      execution: {
        executed_by: parsed.executor_id,
        executed_at: executedAt,
        status: "SUCCEEDED",
        receipt
      }
    });
    return resultEnvelope({ proposal: saved, receipt }, config);
  } catch (error: unknown) {
    const status = error instanceof MetaClientError && error.retryable
      ? "RECONCILIATION_REQUIRED"
      : "FAILED";
    const receipt = sanitizeObject({
      proposal_id: executing.proposal_id,
      action_type: executing.action_type,
      target: executing.target,
      executed_by: parsed.executor_id,
      executed_at: executedAt,
      status,
      error: toSafeError(error).error
    }) as Record<string, unknown>;
    saveProposalRecord(store, {
      ...executing,
      status,
      execution: {
        executed_by: parsed.executor_id,
        executed_at: executedAt,
        status,
        receipt
      }
    });
    if (status === "RECONCILIATION_REQUIRED") {
      throw new SafeToolError("AMBIGUOUS_UPSTREAM_RESULT", "Meta returned an ambiguous or retryable result; reconciliation is required.");
    }
    throw error;
  }
}

export async function handleToolCall(
  toolName: ToolName,
  input: unknown,
  dependencies: HandlerDependencies = {}
): Promise<unknown> {
  if (!(toolName in ToolContracts)) {
    return redactSecrets(skeletonSafeError(toolName));
  }

  const config = dependencies.config ?? loadRuntimeConfig();
  const client = createClient(config, dependencies.fetcher);
  const store = createStore(config, dependencies.store);

  try {
    if (!isToolAllowed(toolName, defaultPolicy)) {
      throw new SafeToolError("POLICY_DENIED", `Tool ${toolName} is denied by the default policy.`);
    }

    switch (toolName) {
      case "meta_connection_status":
        return await handleConnectionStatus(input, config, client);
      case "meta_ad_accounts_list":
        return await handleAdAccountsList(input, config, client, store);
      case "meta_campaigns_list":
        return await handleCampaignsList(input, config, client, store);
      case "meta_adsets_list":
        return await handleAdSetsList(input, config, client, store);
      case "meta_ads_list":
        return await handleAdsList(input, config, client, store);
      case "meta_ad_creatives_list":
        return await handleAdCreativesList(input, config, client, store);
      case "meta_pixels_list":
        return await handlePixelsList(input, config, client, store);
      case "meta_custom_conversions_list":
        return await handleCustomConversionsList(input, config, client, store);
      case "meta_ads_insights_query":
        return await handleAdsInsightsQuery(input, config, client, store);
      case "meta_pages_list":
        return await handlePagesList(input, config, client, store);
      case "meta_page_get":
        return await handlePageGet(input, config, client, store);
      case "meta_page_posts_list":
        return await handlePagePostsList(input, config, client, store);
      case "meta_page_post_comments_list":
        return await handlePagePostCommentsList(input, config, client, store);
      case "meta_page_insights_query":
        return await handlePageInsightsQuery(input, config, client, store);
      case "meta_page_post_insights_query":
        return await handlePagePostInsightsQuery(input, config, client, store);
      case "meta_page_conversations_list":
        return await handlePageConversationsList(input, config, client, store);
      case "meta_instagram_accounts_list":
        return await handleInstagramAccountsList(input, config, client, store);
      case "meta_instagram_media_list":
        return await handleInstagramMediaList(input, config, client, store);
      case "meta_instagram_media_insights_query":
        return await handleInstagramMediaInsightsQuery(input, config, client, store);
      case "meta_lead_forms_list":
        return await handleLeadFormsList(input, config, client, store);
      case "meta_allowed_assets_list":
        return await handleAllowedAssetsList(input, config);
      case "meta_token_health_check":
        return await handleTokenHealthCheck(input, config, client);
      case "meta_permission_probe":
        return await handlePermissionProbe(input, config, client);
      case "search":
        return await handleSearch(input, config, store);
      case "fetch":
        return await handleFetch(input, config, store);
      case "meta_proposal_create_budget_change":
        return await handleCreateBudgetProposal(input, config, client, store);
      case "meta_proposal_create_delivery_status_change":
        return await handleCreateDeliveryStatusProposal(input, config, client, store);
      case "meta_proposal_create_page_post":
        return await handleCreatePagePostProposal(input, config, client, store);
      case "meta_proposal_create_comment_reply":
        return await handleCreateCommentReplyProposal(input, config, store);
      case "meta_proposal_create_message_reply":
        return await handleCreateMessageReplyProposal(input, config, store);
      case "meta_proposals_list":
        return await handleProposalsList(input, config, store);
      case "meta_proposal_get":
        return await handleProposalGet(input, config, store);
      case "meta_proposal_cancel":
        return await handleProposalCancel(input, config, store);
      case "meta_proposal_approve":
        return await handleProposalApprove(input, config, store);
      case "meta_proposal_execute":
        return await handleProposalExecute(input, config, client, store);
      default:
        return redactSecrets(skeletonSafeError(toolName));
    }
  } catch (error: unknown) {
    return toSafeError(error);
  }
}
