export type MetaOperation =
  | "connection.me"
  | "connection.debug_token"
  | "ad_accounts.get"
  | "ad_accounts.list"
  | "campaigns.list"
  | "adsets.list"
  | "ads.list"
  | "ad_creatives.list"
  | "pixels.list"
  | "custom_conversions.list"
  | "ads.insights.query"
  | "pages.list"
  | "pages.get"
  | "page_posts.list"
  | "page_comments.list"
  | "page_insights.query"
  | "page_post_insights.query"
  | "page_conversations.list"
  | "instagram_accounts.list"
  | "instagram_media.list"
  | "instagram_media_insights.query"
  | "lead_forms.list";

export type MetaWriteOperation =
  | "ads.delivery_status.set"
  | "ads.budget.set"
  | "page_post.publish"
  | "comment.reply"
  | "message.reply";

export type MetaRequestSpec = {
  operation: MetaOperation;
  method: "GET";
  pathTemplate: string;
  allowedFields: readonly string[];
};

export const META_GRAPH_API_VERSION = "v25.0";

export const ALLOWED_META_REQUESTS: Record<MetaOperation, MetaRequestSpec> = {
  "connection.me": {
    operation: "connection.me",
    method: "GET",
    pathTemplate: "/me",
    allowedFields: ["id"]
  },
  "connection.debug_token": {
    operation: "connection.debug_token",
    method: "GET",
    pathTemplate: "/debug_token",
    allowedFields: ["data"]
  },
  "ad_accounts.get": {
    operation: "ad_accounts.get",
    method: "GET",
    pathTemplate: "/act_{ad_account_id}",
    allowedFields: ["id", "name", "currency", "timezone_name", "account_status", "disable_reason"]
  },
  "ad_accounts.list": {
    operation: "ad_accounts.list",
    method: "GET",
    pathTemplate: "/me/adaccounts",
    allowedFields: ["id", "name", "currency", "timezone_name", "account_status", "disable_reason"]
  },
  "campaigns.list": {
    operation: "campaigns.list",
    method: "GET",
    pathTemplate: "/act_{ad_account_id}/campaigns",
    allowedFields: ["id", "name", "objective", "configured_status", "effective_status", "buying_type", "updated_time", "daily_budget", "lifetime_budget", "budget_remaining"]
  },
  "adsets.list": {
    operation: "adsets.list",
    method: "GET",
    pathTemplate: "/act_{ad_account_id}/adsets",
    allowedFields: ["id", "name", "campaign_id", "configured_status", "effective_status", "daily_budget", "lifetime_budget", "budget_remaining", "optimization_goal", "billing_event", "updated_time"]
  },
  "ads.list": {
    operation: "ads.list",
    method: "GET",
    pathTemplate: "/act_{ad_account_id}/ads",
    allowedFields: ["id", "name", "campaign_id", "adset_id", "configured_status", "effective_status", "creative", "updated_time"]
  },
  "ad_creatives.list": {
    operation: "ad_creatives.list",
    method: "GET",
    pathTemplate: "/act_{ad_account_id}/adcreatives",
    allowedFields: ["id", "name", "title", "body", "object_story_spec", "effective_object_story_id", "thumbnail_url"]
  },
  "pixels.list": {
    operation: "pixels.list",
    method: "GET",
    pathTemplate: "/act_{ad_account_id}/adspixels",
    allowedFields: ["id", "name", "code", "creation_time", "last_fired_time", "is_unavailable"]
  },
  "custom_conversions.list": {
    operation: "custom_conversions.list",
    method: "GET",
    pathTemplate: "/act_{ad_account_id}/customconversions",
    allowedFields: ["id", "name", "custom_event_type", "event_source_type", "creation_time", "last_fired_time", "is_unavailable"]
  },
  "ads.insights.query": {
    operation: "ads.insights.query",
    method: "GET",
    pathTemplate: "/act_{ad_account_id}/insights",
    allowedFields: [
      "account_id",
      "campaign_id",
      "adset_id",
      "ad_id",
      "date_start",
      "date_stop",
      "spend",
      "impressions",
      "reach",
      "clicks",
      "inline_link_clicks",
      "ctr",
      "cpc",
      "cpm",
      "frequency",
      "actions",
      "cost_per_action_type"
    ]
  },
  "pages.list": {
    operation: "pages.list",
    method: "GET",
    pathTemplate: "/me/accounts",
    allowedFields: ["id", "name", "category", "tasks", "instagram_business_account", "access_token"]
  },
  "pages.get": {
    operation: "pages.get",
    method: "GET",
    pathTemplate: "/{page_id}",
    allowedFields: ["id", "name", "category", "fan_count", "followers_count", "link", "verification_status"]
  },
  "page_posts.list": {
    operation: "page_posts.list",
    method: "GET",
    pathTemplate: "/{page_id}/posts",
    allowedFields: ["id", "message", "created_time", "permalink_url", "status_type", "is_published", "scheduled_publish_time"]
  },
  "page_comments.list": {
    operation: "page_comments.list",
    method: "GET",
    pathTemplate: "/{post_id}/comments",
    allowedFields: ["id", "message", "created_time", "from", "like_count", "comment_count", "permalink_url", "can_reply_privately", "is_hidden"]
  },
  "page_insights.query": {
    operation: "page_insights.query",
    method: "GET",
    pathTemplate: "/{page_id}/insights",
    allowedFields: ["name", "period", "values", "title", "description", "id"]
  },
  "page_post_insights.query": {
    operation: "page_post_insights.query",
    method: "GET",
    pathTemplate: "/{post_id}/insights",
    allowedFields: ["name", "period", "values", "title", "description", "id"]
  },
  "page_conversations.list": {
    operation: "page_conversations.list",
    method: "GET",
    pathTemplate: "/{page_id}/conversations",
    allowedFields: ["id", "updated_time", "unread_count", "message_count"]
  },
  "instagram_accounts.list": {
    operation: "instagram_accounts.list",
    method: "GET",
    pathTemplate: "/{page_id}",
    allowedFields: ["instagram_business_account{id,username,name,followers_count,media_count}"]
  },
  "instagram_media.list": {
    operation: "instagram_media.list",
    method: "GET",
    pathTemplate: "/{instagram_account_id}/media",
    allowedFields: ["id", "caption", "media_type", "media_url", "permalink", "timestamp", "like_count", "comments_count"]
  },
  "instagram_media_insights.query": {
    operation: "instagram_media_insights.query",
    method: "GET",
    pathTemplate: "/{media_id}/insights",
    allowedFields: ["name", "period", "values", "title", "description", "id"]
  },
  "lead_forms.list": {
    operation: "lead_forms.list",
    method: "GET",
    pathTemplate: "/{page_id}/leadgen_forms",
    allowedFields: ["id", "name", "status", "leads_count", "created_time", "expired_leads_count"]
  }
};

export const ALLOWED_META_WRITE_REQUESTS: Record<MetaWriteOperation, {
  operation: MetaWriteOperation;
  method: "POST";
  pathTemplate: string;
  allowedParams: readonly string[];
}> = {
  "ads.delivery_status.set": {
    operation: "ads.delivery_status.set",
    method: "POST",
    pathTemplate: "/{object_id}",
    allowedParams: ["status"]
  },
  "ads.budget.set": {
    operation: "ads.budget.set",
    method: "POST",
    pathTemplate: "/{object_id}",
    allowedParams: ["daily_budget", "lifetime_budget"]
  },
  "page_post.publish": {
    operation: "page_post.publish",
    method: "POST",
    pathTemplate: "/{page_id}/feed",
    allowedParams: ["message", "link", "published", "scheduled_publish_time"]
  },
  "comment.reply": {
    operation: "comment.reply",
    method: "POST",
    pathTemplate: "/{comment_id}/comments",
    allowedParams: ["message"]
  },
  "message.reply": {
    operation: "message.reply",
    method: "POST",
    pathTemplate: "/{page_id}/messages",
    allowedParams: ["recipient", "message"]
  }
};

export type SafeErrorCode =
  | "AUTH_REQUIRED"
  | "TOKEN_EXPIRED"
  | "INSUFFICIENT_SCOPE"
  | "ASSET_NOT_ALLOWED"
  | "INVALID_QUERY"
  | "INVALID_CURSOR"
  | "RATE_LIMITED"
  | "UPSTREAM_TRANSIENT"
  | "DATA_UNAVAILABLE";

export class MetaClientError extends Error {
  readonly safeCode: SafeErrorCode;
  readonly retryable: boolean;
  readonly retryAfterMs: number | undefined;
  readonly requiredCapability: string | undefined;
  readonly providerCode: number | undefined;
  readonly providerSubcode: number | undefined;

  constructor(
    safeCode: SafeErrorCode,
    message: string,
    options: {
      retryable?: boolean;
      retryAfterMs?: number;
      requiredCapability?: string;
      providerCode?: number;
      providerSubcode?: number;
      cause?: unknown;
    } = {}
  ) {
    super(message, { cause: options.cause });
    this.name = "MetaClientError";
    this.safeCode = safeCode;
    this.retryable = options.retryable ?? false;
    this.retryAfterMs = options.retryAfterMs;
    this.requiredCapability = options.requiredCapability;
    this.providerCode = options.providerCode;
    this.providerSubcode = options.providerSubcode;
  }
}

export type FetchLike = (input: URL, init?: RequestInit) => Promise<Response>;

export type MetaClientOptions = {
  accessToken?: string | undefined;
  apiVersion?: string | undefined;
  baseUrl?: string | undefined;
  fetcher?: FetchLike | undefined;
  requestTimeoutMs?: number | undefined;
};

export type ConfiguredAdAccount = {
  id: string;
  name?: string;
  status?: string;
  alias?: string;
};

export type AdAccount = {
  id: string;
  name?: string;
  currency?: string;
  timezone_name?: string;
  account_status?: number;
  disable_reason?: number;
  configured_name?: string;
  configured_alias?: string;
};

export type Campaign = {
  id: string;
  name?: string;
  objective?: string;
  configured_status?: string;
  effective_status?: string;
  buying_type?: string;
  updated_time?: string;
};

export type MetaObject = Record<string, unknown> & {
  id?: string;
  name?: string;
};

export type PageToken = {
  page_id: string;
  access_token: string;
};

export type InsightRow = Record<string, unknown> & {
  account_id?: string;
  campaign_id?: string;
  adset_id?: string;
  ad_id?: string;
  date_start?: string;
  date_stop?: string;
};

export type PageResult<T> = {
  data: T[];
  nextCursor?: string;
  partial: boolean;
};

export type ConnectionPrincipal = {
  id?: string;
};

export type DebugTokenData = {
  is_valid?: boolean;
  type?: string;
  expires_at?: number;
  data_access_expires_at?: number;
  scopes?: string[];
};

type MetaPaging = {
  cursors?: {
    after?: string;
  };
};

type MetaListResponse<T> = {
  data?: T[];
  paging?: MetaPaging;
};

type MetaErrorPayload = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

type GraphParam = string | number | boolean;

const DEFAULT_REQUEST_TIMEOUT_MS = 20_000;
const LOCAL_CURSOR_PREFIX = "allowlist:";

function cleanOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export function normalizeAdAccountId(value: string): string {
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    return `act_${trimmed}`;
  }
  if (/^act_\d+$/.test(trimmed)) {
    return trimmed;
  }
  throw new MetaClientError(
    "INVALID_QUERY",
    "Ad account IDs must be numeric or use the act_<digits> form."
  );
}

export function normalizeConfiguredAdAccounts(raw: unknown): ConfiguredAdAccount[] {
  const source = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { accounts?: unknown }).accounts)
      ? (raw as { accounts: unknown[] }).accounts
      : [];

  const seen = new Set<string>();
  const accounts: ConfiguredAdAccount[] = [];

  for (const item of source) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const record = item as Record<string, unknown>;
    const rawId = typeof record.id === "string"
      ? record.id
      : typeof record.account_id === "string"
        ? record.account_id
        : undefined;
    if (!rawId) {
      continue;
    }

    const status = typeof record.status === "string" ? record.status.trim().toLowerCase() : undefined;
    if (status && status !== "active") {
      continue;
    }

    const id = normalizeAdAccountId(rawId);
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);

    const name = typeof record.name === "string"
      ? cleanOptional(record.name)
      : typeof record.account_name === "string"
        ? cleanOptional(record.account_name)
        : undefined;
    const alias = typeof record.alias === "string" ? cleanOptional(record.alias) : undefined;

    accounts.push({
      id,
      ...(name ? { name } : {}),
      ...(status ? { status } : {}),
      ...(alias ? { alias } : {})
    });
  }

  return accounts;
}

export function assertAdAccountAllowed(
  adAccountId: string,
  allowlist: readonly ConfiguredAdAccount[]
): ConfiguredAdAccount {
  const normalized = normalizeAdAccountId(adAccountId);
  const account = allowlist.find((candidate) => candidate.id === normalized);
  if (!account) {
    throw new MetaClientError(
      "ASSET_NOT_ALLOWED",
      "The requested ad account is not configured in the explicit allowlist.",
      { requiredCapability: "configured_ad_account" }
    );
  }
  return account;
}

function encodeLocalCursor(index: number): string {
  return `${LOCAL_CURSOR_PREFIX}${Buffer.from(String(index), "utf8").toString("base64url")}`;
}

function decodeLocalCursor(cursor: string | undefined): number {
  if (!cursor) {
    return 0;
  }
  if (!cursor.startsWith(LOCAL_CURSOR_PREFIX)) {
    throw new MetaClientError("INVALID_CURSOR", "The pagination cursor is not valid for this result set.");
  }
  const raw = Buffer.from(cursor.slice(LOCAL_CURSOR_PREFIX.length), "base64url").toString("utf8");
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new MetaClientError("INVALID_CURSOR", "The pagination cursor is malformed.");
  }
  return parsed;
}

function formatFields(fields: readonly string[]): string {
  return fields.join(",");
}

function metaLevel(level: "account" | "campaign" | "ad_set" | "ad"): string {
  return level === "ad_set" ? "adset" : level;
}

function timestampToIso(value: unknown): string | undefined {
  if (value === undefined || value === null || value === 0 || value === "0") {
    return undefined;
  }
  const number = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(number)) {
    return undefined;
  }
  return new Date(number * 1000).toISOString();
}

function safeProviderMessage(payload: MetaErrorPayload, status: number): string {
  const message = payload.error?.message?.replace(/\s+/g, " ").trim();
  if (message) {
    return message.slice(0, 500);
  }
  return `Meta API request failed with HTTP ${status}.`;
}

function safeCodeFromMeta(status: number, payload: MetaErrorPayload): SafeErrorCode {
  const code = payload.error?.code;
  if (code === 190) {
    return "TOKEN_EXPIRED";
  }
  if (code === 10 || code === 200 || code === 299) {
    return "INSUFFICIENT_SCOPE";
  }
  if (code === 4 || code === 17 || code === 32 || code === 613 || status === 429) {
    return "RATE_LIMITED";
  }
  if (status >= 500) {
    return "UPSTREAM_TRANSIENT";
  }
  if (status === 401 || status === 403) {
    return "AUTH_REQUIRED";
  }
  return "INVALID_QUERY";
}

function errorFromMetaResponse(status: number, payload: MetaErrorPayload): MetaClientError {
  const safeCode = safeCodeFromMeta(status, payload);
  return new MetaClientError(safeCode, safeProviderMessage(payload, status), {
    retryable: safeCode === "RATE_LIMITED" || safeCode === "UPSTREAM_TRANSIENT",
    ...(safeCode === "INSUFFICIENT_SCOPE" ? { requiredCapability: "meta_ads_read" } : {}),
    ...(payload.error?.code !== undefined ? { providerCode: payload.error.code } : {}),
    ...(payload.error?.error_subcode !== undefined ? { providerSubcode: payload.error.error_subcode } : {})
  });
}

function pageResult<T>(response: MetaListResponse<T>): PageResult<T> {
  return {
    data: response.data ?? [],
    partial: Boolean(response.paging?.cursors?.after),
    ...(response.paging?.cursors?.after ? { nextCursor: response.paging.cursors.after } : {})
  };
}

export class MetaClientBoundary {
  constructor(
    private readonly apiVersion = META_GRAPH_API_VERSION
  ) {}

  describe(operation: MetaOperation): MetaRequestSpec & { apiVersion: string } {
    return {
      ...ALLOWED_META_REQUESTS[operation],
      apiVersion: this.apiVersion
    };
  }

  describeAll(): Array<MetaRequestSpec & { apiVersion: string }> {
    return Object.keys(ALLOWED_META_REQUESTS).map((operation) =>
      this.describe(operation as MetaOperation)
    );
  }

  graphRequest(): never {
    throw new Error("Arbitrary Graph API requests are prohibited. Add a named, allowlisted operation instead.");
  }

  assertReadOnly(): void {
    const mutating = this.describeAll().filter((request) => request.method !== "GET");
    if (mutating.length > 0) {
      throw new Error(`Mutating Meta operations are not allowed in v1: ${mutating.map((request) => request.operation).join(", ")}`);
    }
  }
}

export class MetaReadClient {
  private readonly accessToken: string | undefined;
  private readonly apiVersion: string;
  private readonly baseUrl: string;
  private readonly fetcher: FetchLike;
  private readonly requestTimeoutMs: number;

  constructor(options: MetaClientOptions = {}) {
    this.accessToken = cleanOptional(options.accessToken);
    this.apiVersion = cleanOptional(options.apiVersion) ?? META_GRAPH_API_VERSION;
    this.baseUrl = cleanOptional(options.baseUrl) ?? "https://graph.facebook.com";
    this.fetcher = options.fetcher ?? fetch;
    this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  }

  get configuredApiVersion(): string {
    return this.apiVersion;
  }

  hasAccessToken(): boolean {
    return Boolean(this.accessToken);
  }

  async getPrincipal(): Promise<ConnectionPrincipal> {
    return this.graphGet<ConnectionPrincipal>("connection.me", "/me", {
      fields: formatFields(ALLOWED_META_REQUESTS["connection.me"].allowedFields)
    });
  }

  async debugToken(): Promise<DebugTokenData> {
    const response = await this.graphGet<{ data?: DebugTokenData }>("connection.debug_token", "/debug_token", {
      input_token: this.requireAccessToken()
    });
    return response.data ?? {};
  }

  async getAdAccount(adAccountId: string, configured?: ConfiguredAdAccount): Promise<AdAccount> {
    const id = normalizeAdAccountId(adAccountId);
    const account = await this.graphGet<AdAccount>("ad_accounts.get", `/${id}`, {
      fields: formatFields(ALLOWED_META_REQUESTS["ad_accounts.get"].allowedFields)
    });
    return this.decorateAdAccount(account, configured);
  }

  async listAllowedAdAccounts(
    allowlist: readonly ConfiguredAdAccount[],
    input: { limit?: number | undefined; after?: string | undefined }
  ): Promise<PageResult<AdAccount>> {
    const limit = input.limit ?? 100;
    const start = decodeLocalCursor(input.after);
    const page = allowlist.slice(start, start + limit);
    const accounts: AdAccount[] = [];

    for (const configured of page) {
      accounts.push(await this.getAdAccount(configured.id, configured));
    }

    const nextIndex = start + page.length;
    return {
      data: accounts,
      partial: false,
      ...(nextIndex < allowlist.length ? { nextCursor: encodeLocalCursor(nextIndex) } : {})
    };
  }

  async listCampaigns(input: {
    ad_account_id: string;
    limit?: number | undefined;
    after?: string | undefined;
    effective_status?: string[] | undefined;
    objective?: string[] | undefined;
    updated_since?: string | undefined;
  }): Promise<PageResult<Campaign>> {
    const id = normalizeAdAccountId(input.ad_account_id);
    const params: Record<string, string | number> = {
      fields: formatFields(ALLOWED_META_REQUESTS["campaigns.list"].allowedFields),
      limit: input.limit ?? 100
    };
    if (input.after) {
      params.after = input.after;
    }
    if (input.effective_status && input.effective_status.length > 0) {
      params.effective_status = JSON.stringify(input.effective_status);
    }

    const response = await this.graphGet<MetaListResponse<Campaign>>("campaigns.list", `/${id}/campaigns`, params);
    let campaigns = response.data ?? [];
    if (input.objective && input.objective.length > 0) {
      const allowed = new Set(input.objective);
      campaigns = campaigns.filter((campaign) => campaign.objective && allowed.has(campaign.objective));
    }
    if (input.updated_since) {
      const since = Date.parse(input.updated_since);
      campaigns = campaigns.filter((campaign) =>
        campaign.updated_time ? Date.parse(campaign.updated_time) >= since : false
      );
    }

    return {
      data: campaigns,
      partial: Boolean(response.paging?.cursors?.after),
      ...(response.paging?.cursors?.after ? { nextCursor: response.paging.cursors.after } : {})
    };
  }

  async listAdSets(input: {
    ad_account_id: string;
    campaign_id?: string | undefined;
    effective_status?: string[] | undefined;
    limit?: number | undefined;
    after?: string | undefined;
  }): Promise<PageResult<MetaObject>> {
    const params = this.adEdgeParams("adsets.list", input);
    if (input.campaign_id) {
      params.filtering = JSON.stringify([{ field: "campaign.id", operator: "EQUAL", value: input.campaign_id }]);
    }
    return this.listAdEdge("adsets.list", input.ad_account_id, "/adsets", params);
  }

  async listAds(input: {
    ad_account_id: string;
    campaign_id?: string | undefined;
    adset_id?: string | undefined;
    effective_status?: string[] | undefined;
    limit?: number | undefined;
    after?: string | undefined;
  }): Promise<PageResult<MetaObject>> {
    const params = this.adEdgeParams("ads.list", input);
    const filters: Array<Record<string, string>> = [];
    if (input.campaign_id) {
      filters.push({ field: "campaign.id", operator: "EQUAL", value: input.campaign_id });
    }
    if (input.adset_id) {
      filters.push({ field: "adset.id", operator: "EQUAL", value: input.adset_id });
    }
    if (filters.length > 0) {
      params.filtering = JSON.stringify(filters);
    }
    return this.listAdEdge("ads.list", input.ad_account_id, "/ads", params);
  }

  async listAdCreatives(input: {
    ad_account_id: string;
    limit?: number | undefined;
    after?: string | undefined;
  }): Promise<PageResult<MetaObject>> {
    return this.listAdEdge("ad_creatives.list", input.ad_account_id, "/adcreatives", this.adEdgeParams("ad_creatives.list", input));
  }

  async listPixels(input: {
    ad_account_id: string;
    limit?: number | undefined;
    after?: string | undefined;
  }): Promise<PageResult<MetaObject>> {
    return this.listAdEdge("pixels.list", input.ad_account_id, "/adspixels", this.adEdgeParams("pixels.list", input));
  }

  async listCustomConversions(input: {
    ad_account_id: string;
    limit?: number | undefined;
    after?: string | undefined;
  }): Promise<PageResult<MetaObject>> {
    return this.listAdEdge("custom_conversions.list", input.ad_account_id, "/customconversions", this.adEdgeParams("custom_conversions.list", input));
  }

  async queryInsights(input: {
    ad_account_id: string;
    level: "account" | "campaign" | "ad_set" | "ad";
    time_range: { since: string; until: string };
    metrics: string[];
    breakdowns?: string[] | undefined;
    time_increment?: "all_days" | "1" | "7" | "monthly" | undefined;
    limit?: number | undefined;
    after?: string | undefined;
  }): Promise<PageResult<InsightRow>> {
    const id = normalizeAdAccountId(input.ad_account_id);
    const fields = [
      "account_id",
      "campaign_id",
      "adset_id",
      "ad_id",
      "date_start",
      "date_stop",
      ...input.metrics
    ];
    const allowed = new Set(ALLOWED_META_REQUESTS["ads.insights.query"].allowedFields);
    const uniqueFields = [...new Set(fields)].filter((field) => allowed.has(field));

    const params: Record<string, string | number> = {
      fields: uniqueFields.join(","),
      level: metaLevel(input.level),
      time_range: JSON.stringify(input.time_range),
      limit: input.limit ?? 100
    };
    if (input.after) {
      params.after = input.after;
    }
    if (input.breakdowns && input.breakdowns.length > 0) {
      params.breakdowns = input.breakdowns.join(",");
    }
    if (input.time_increment && input.time_increment !== "all_days") {
      params.time_increment = input.time_increment;
    }

    const response = await this.graphGet<MetaListResponse<InsightRow>>("ads.insights.query", `/${id}/insights`, params);
    return {
      data: response.data ?? [],
      partial: Boolean(response.paging?.cursors?.after),
      ...(response.paging?.cursors?.after ? { nextCursor: response.paging.cursors.after } : {})
    };
  }

  async listPages(input: { limit?: number | undefined; after?: string | undefined }): Promise<PageResult<MetaObject>> {
    const response = await this.graphGet<MetaListResponse<MetaObject>>("pages.list", "/me/accounts", {
      fields: formatFields(ALLOWED_META_REQUESTS["pages.list"].allowedFields),
      limit: input.limit ?? 100,
      ...(input.after ? { after: input.after } : {})
    });
    return pageResult(response);
  }

  async getPage(pageId: string): Promise<MetaObject> {
    return this.graphGet<MetaObject>("pages.get", `/${pageId}`, {
      fields: formatFields(ALLOWED_META_REQUESTS["pages.get"].allowedFields)
    }, await this.getPageAccessToken(pageId));
  }

  async listPagePosts(input: {
    page_id: string;
    include_scheduled?: boolean | undefined;
    limit?: number | undefined;
    after?: string | undefined;
  }): Promise<PageResult<MetaObject>> {
    const path = input.include_scheduled ? `/${input.page_id}/scheduled_posts` : `/${input.page_id}/posts`;
    const response = await this.graphGet<MetaListResponse<MetaObject>>("page_posts.list", path, {
      fields: formatFields(ALLOWED_META_REQUESTS["page_posts.list"].allowedFields),
      limit: input.limit ?? 100,
      ...(input.after ? { after: input.after } : {})
    }, await this.getPageAccessToken(input.page_id));
    return pageResult(response);
  }

  async listPagePostComments(input: {
    page_id?: string | undefined;
    post_id: string;
    order?: "chronological" | "reverse_chronological" | undefined;
    limit?: number | undefined;
    after?: string | undefined;
  }): Promise<PageResult<MetaObject>> {
    const response = await this.graphGet<MetaListResponse<MetaObject>>("page_comments.list", `/${input.post_id}/comments`, {
      fields: formatFields(ALLOWED_META_REQUESTS["page_comments.list"].allowedFields),
      limit: input.limit ?? 100,
      ...(input.after ? { after: input.after } : {}),
      ...(input.order ? { order: input.order } : {})
    }, input.page_id ? await this.getPageAccessToken(input.page_id) : this.requireAccessToken());
    return pageResult(response);
  }

  async queryPageInsights(input: {
    page_id: string;
    metrics: string[];
    period?: "day" | "week" | "days_28" | "lifetime" | undefined;
    since?: string | undefined;
    until?: string | undefined;
    limit?: number | undefined;
    after?: string | undefined;
  }): Promise<PageResult<MetaObject>> {
    const response = await this.graphGet<MetaListResponse<MetaObject>>("page_insights.query", `/${input.page_id}/insights`, {
      metric: input.metrics.join(","),
      limit: input.limit ?? 100,
      ...(input.period ? { period: input.period } : {}),
      ...(input.since ? { since: input.since } : {}),
      ...(input.until ? { until: input.until } : {}),
      ...(input.after ? { after: input.after } : {})
    }, await this.getPageAccessToken(input.page_id));
    return pageResult(response);
  }

  async queryPagePostInsights(input: {
    page_id?: string | undefined;
    post_id: string;
    metrics: string[];
    limit?: number | undefined;
    after?: string | undefined;
  }): Promise<PageResult<MetaObject>> {
    const response = await this.graphGet<MetaListResponse<MetaObject>>("page_post_insights.query", `/${input.post_id}/insights`, {
      metric: input.metrics.join(","),
      limit: input.limit ?? 100,
      ...(input.after ? { after: input.after } : {})
    }, input.page_id ? await this.getPageAccessToken(input.page_id) : this.requireAccessToken());
    return pageResult(response);
  }

  async listPageConversations(input: {
    page_id: string;
    limit?: number | undefined;
    after?: string | undefined;
  }): Promise<PageResult<MetaObject>> {
    const response = await this.graphGet<MetaListResponse<MetaObject>>("page_conversations.list", `/${input.page_id}/conversations`, {
      fields: formatFields(ALLOWED_META_REQUESTS["page_conversations.list"].allowedFields),
      limit: input.limit ?? 100,
      ...(input.after ? { after: input.after } : {})
    }, await this.getPageAccessToken(input.page_id));
    return pageResult(response);
  }

  async listInstagramAccounts(input: {
    page_id: string;
  }): Promise<MetaObject> {
    return this.graphGet<MetaObject>("instagram_accounts.list", `/${input.page_id}`, {
      fields: formatFields(ALLOWED_META_REQUESTS["instagram_accounts.list"].allowedFields)
    }, await this.getPageAccessToken(input.page_id));
  }

  async listInstagramMedia(input: {
    instagram_account_id: string;
    limit?: number | undefined;
    after?: string | undefined;
  }): Promise<PageResult<MetaObject>> {
    const response = await this.graphGet<MetaListResponse<MetaObject>>("instagram_media.list", `/${input.instagram_account_id}/media`, {
      fields: formatFields(ALLOWED_META_REQUESTS["instagram_media.list"].allowedFields),
      limit: input.limit ?? 100,
      ...(input.after ? { after: input.after } : {})
    });
    return pageResult(response);
  }

  async queryInstagramMediaInsights(input: {
    media_id: string;
    metrics: string[];
    limit?: number | undefined;
    after?: string | undefined;
  }): Promise<PageResult<MetaObject>> {
    const response = await this.graphGet<MetaListResponse<MetaObject>>("instagram_media_insights.query", `/${input.media_id}/insights`, {
      metric: input.metrics.join(","),
      limit: input.limit ?? 100,
      ...(input.after ? { after: input.after } : {})
    });
    return pageResult(response);
  }

  async listLeadForms(input: {
    page_id: string;
    limit?: number | undefined;
    after?: string | undefined;
  }): Promise<PageResult<MetaObject>> {
    const response = await this.graphGet<MetaListResponse<MetaObject>>("lead_forms.list", `/${input.page_id}/leadgen_forms`, {
      fields: formatFields(ALLOWED_META_REQUESTS["lead_forms.list"].allowedFields),
      limit: input.limit ?? 100,
      ...(input.after ? { after: input.after } : {})
    }, await this.getPageAccessToken(input.page_id));
    return pageResult(response);
  }

  async setDeliveryStatus(input: {
    object_id: string;
    status: "ACTIVE" | "PAUSED";
  }): Promise<MetaObject> {
    return this.graphPost<MetaObject>("ads.delivery_status.set", `/${input.object_id}`, {
      status: input.status
    });
  }

  async setBudget(input: {
    object_id: string;
    budget_type: "daily" | "lifetime";
    amount_minor: string;
  }): Promise<MetaObject> {
    return this.graphPost<MetaObject>("ads.budget.set", `/${input.object_id}`, {
      [input.budget_type === "daily" ? "daily_budget" : "lifetime_budget"]: input.amount_minor
    });
  }

  async publishPagePost(input: {
    page_id: string;
    message: string;
    link?: string | undefined;
    scheduled_publish_time?: string | undefined;
  }): Promise<MetaObject> {
    const params: Record<string, GraphParam> = {
      message: input.message,
      ...(input.link ? { link: input.link } : {})
    };
    if (input.scheduled_publish_time) {
      params.published = false;
      params.scheduled_publish_time = Math.floor(Date.parse(input.scheduled_publish_time) / 1000);
    }
    return this.graphPost<MetaObject>("page_post.publish", `/${input.page_id}/feed`, params, await this.getPageAccessToken(input.page_id));
  }

  async replyToComment(input: {
    page_id: string;
    comment_id: string;
    message: string;
  }): Promise<MetaObject> {
    return this.graphPost<MetaObject>("comment.reply", `/${input.comment_id}/comments`, {
      message: input.message
    }, await this.getPageAccessToken(input.page_id));
  }

  async replyToMessage(input: {
    page_id: string;
    recipient_id: string;
    message: string;
  }): Promise<MetaObject> {
    return this.graphPost<MetaObject>("message.reply", `/${input.page_id}/messages`, {
      recipient: JSON.stringify({ id: input.recipient_id }),
      message: JSON.stringify({ text: input.message })
    }, await this.getPageAccessToken(input.page_id));
  }

  tokenTimestamps(data: DebugTokenData): { expires_at?: string; data_access_expires_at?: string } {
    const expiresAt = timestampToIso(data.expires_at);
    const dataAccessExpiresAt = timestampToIso(data.data_access_expires_at);
    return {
      ...(expiresAt ? { expires_at: expiresAt } : {}),
      ...(dataAccessExpiresAt ? { data_access_expires_at: dataAccessExpiresAt } : {})
    };
  }

  private decorateAdAccount(account: AdAccount, configured?: ConfiguredAdAccount): AdAccount {
    return {
      ...account,
      id: normalizeAdAccountId(account.id),
      ...(configured?.name ? { configured_name: configured.name } : {}),
      ...(configured?.alias ? { configured_alias: configured.alias } : {})
    };
  }

  private adEdgeParams(
    operation: MetaOperation,
    input: { effective_status?: string[] | undefined; limit?: number | undefined; after?: string | undefined }
  ): Record<string, string | number> {
    const params: Record<string, string | number> = {
      fields: formatFields(ALLOWED_META_REQUESTS[operation].allowedFields),
      limit: input.limit ?? 100
    };
    if (input.after) {
      params.after = input.after;
    }
    if (input.effective_status && input.effective_status.length > 0) {
      params.effective_status = JSON.stringify(input.effective_status);
    }
    return params;
  }

  private async listAdEdge(
    operation: MetaOperation,
    adAccountId: string,
    edgePath: string,
    params: Record<string, string | number>
  ): Promise<PageResult<MetaObject>> {
    const id = normalizeAdAccountId(adAccountId);
    const response = await this.graphGet<MetaListResponse<MetaObject>>(operation, `/${id}${edgePath}`, params);
    return pageResult(response);
  }

  private async getPageAccessToken(pageId: string): Promise<string> {
    const response = await this.graphGet<MetaListResponse<PageToken & MetaObject>>("pages.list", "/me/accounts", {
      fields: "id,access_token",
      limit: 100
    });
    const page = (response.data ?? []).find((item) => item.id === pageId);
    if (!page?.access_token) {
      throw new MetaClientError("ASSET_NOT_ALLOWED", "The configured token cannot derive a Page access token for this Page.", {
        requiredCapability: "page_access_token"
      });
    }
    return page.access_token;
  }

  private async graphGet<T>(
    operation: MetaOperation,
    path: string,
    params: Record<string, GraphParam>,
    accessToken = this.requireAccessToken()
  ): Promise<T> {
    const request = ALLOWED_META_REQUESTS[operation];
    if (request.method !== "GET") {
      throw new MetaClientError("DATA_UNAVAILABLE", "Only read-only Meta operations are enabled.");
    }

    const url = new URL(`${this.baseUrl.replace(/\/+$/, "")}/${this.apiVersion}/${path.replace(/^\/+/, "")}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
    url.searchParams.set("access_token", accessToken);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    try {
      const response = await this.fetcher(url, {
        method: "GET",
        signal: controller.signal
      });
      const text = await response.text();
      const payload = text ? JSON.parse(text) as T & MetaErrorPayload : {} as T & MetaErrorPayload;
      if (!response.ok || hasOwn(payload, "error")) {
        throw errorFromMetaResponse(response.status, payload);
      }
      return payload;
    } catch (error: unknown) {
      if (error instanceof MetaClientError) {
        throw error;
      }
      if (error instanceof SyntaxError) {
        throw new MetaClientError("UPSTREAM_TRANSIENT", "Meta API returned a non-JSON response.", {
          retryable: true,
          cause: error
        });
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new MetaClientError("UPSTREAM_TRANSIENT", "Meta API request timed out.", {
          retryable: true,
          cause: error
        });
      }
      throw new MetaClientError("UPSTREAM_TRANSIENT", "Meta API request failed before a response was received.", {
        retryable: true,
        cause: error
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async graphPost<T>(
    operation: MetaWriteOperation,
    path: string,
    params: Record<string, GraphParam>,
    accessToken = this.requireAccessToken()
  ): Promise<T> {
    const request = ALLOWED_META_WRITE_REQUESTS[operation];
    const invalidParams = Object.keys(params).filter((key) => !request.allowedParams.includes(key));
    if (invalidParams.length > 0) {
      throw new MetaClientError("INVALID_QUERY", `Unsupported write parameters for ${operation}: ${invalidParams.join(", ")}`);
    }

    const url = new URL(`${this.baseUrl.replace(/\/+$/, "")}/${this.apiVersion}/${path.replace(/^\/+/, "")}`);
    url.searchParams.set("access_token", accessToken);
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      body.set(key, String(value));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    try {
      const response = await this.fetcher(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/x-www-form-urlencoded"
        },
        body
      });
      const text = await response.text();
      const payload = text ? JSON.parse(text) as T & MetaErrorPayload : {} as T & MetaErrorPayload;
      if (!response.ok || hasOwn(payload, "error")) {
        throw errorFromMetaResponse(response.status, payload);
      }
      return payload;
    } catch (error: unknown) {
      if (error instanceof MetaClientError) {
        throw error;
      }
      if (error instanceof SyntaxError) {
        throw new MetaClientError("UPSTREAM_TRANSIENT", "Meta API returned a non-JSON response.", {
          retryable: true,
          cause: error
        });
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new MetaClientError("UPSTREAM_TRANSIENT", "Meta API request timed out.", {
          retryable: true,
          cause: error
        });
      }
      throw new MetaClientError("UPSTREAM_TRANSIENT", "Meta API request failed before a response was received.", {
        retryable: true,
        cause: error
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private requireAccessToken(): string {
    if (!this.accessToken) {
      throw new MetaClientError("AUTH_REQUIRED", "META_ADS_TOKEN is not configured.");
    }
    return this.accessToken;
  }
}
