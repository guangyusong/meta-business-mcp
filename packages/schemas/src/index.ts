import { z } from "zod";

export const DataClassificationSchema = z.enum([
  "business_confidential",
  "personal",
  "restricted"
]);

export const SafeErrorCodeSchema = z.enum([
  "AUTH_REQUIRED",
  "TOKEN_EXPIRED",
  "INSUFFICIENT_SCOPE",
  "ASSET_NOT_ALLOWED",
  "ASSET_ROLE_MISMATCH",
  "INVALID_QUERY",
  "INVALID_CURSOR",
  "RATE_LIMITED",
  "UPSTREAM_TRANSIENT",
  "DATA_UNAVAILABLE",
  "PII_POLICY_DENIED",
  "POLICY_DENIED",
  "STALE_PROPOSAL",
  "PRECONDITION_FAILED",
  "APPROVAL_REQUIRED",
  "APPROVAL_EXPIRED",
  "AMBIGUOUS_UPSTREAM_RESULT"
]);

export const SafeErrorSchema = z.object({
  error: z.object({
    code: SafeErrorCodeSchema,
    safe_message: z.string().min(1).max(500),
    retryable: z.boolean(),
    retry_after_ms: z.number().int().positive().optional(),
    required_capability: z.string().max(100).optional(),
    remediation: z.string().max(500).optional()
  }).strict()
}).strict();

export type SafeError = z.infer<typeof SafeErrorSchema>;

export const ToolResultMetaSchema = z.object({
  request_id: z.string().min(1),
  as_of: z.string().datetime(),
  meta_api_version: z.string().min(1),
  partial: z.boolean(),
  next_cursor: z.string().optional(),
  warnings: z.array(z.object({
    code: z.string().min(1),
    message: z.string().min(1)
  }).strict()),
  data_classification: DataClassificationSchema
}).strict();

export const ToolResultSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    meta: ToolResultMetaSchema
  }).strict();

export const MetaIdSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_:-]+$/);
export const CursorSchema = z.string().min(1).max(2048);
export const Rfc3339DateTimeSchema = z.string().datetime();
export const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const CurrencyCodeSchema = z.string().regex(/^[A-Z]{3}$/);
export const MinorUnitMoneySchema = z.string().regex(/^-?\d+$/);

export const PaginationInputSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  after: CursorSchema.optional()
}).strict();

export const TimeRangeSchema = z.object({
  since: IsoDateSchema,
  until: IsoDateSchema
}).strict();

export const ConnectionStatusInputSchema = z.object({
  connection_id: MetaIdSchema.optional()
}).strict();

export const AdAccountsListInputSchema = PaginationInputSchema.extend({
  connection_id: MetaIdSchema.optional()
}).strict();

export const CampaignsListInputSchema = PaginationInputSchema.extend({
  ad_account_id: MetaIdSchema,
  effective_status: z.array(z.enum(["ACTIVE", "PAUSED", "DELETED", "ARCHIVED", "IN_PROCESS", "WITH_ISSUES"])).max(10).optional(),
  objective: z.array(z.string().min(1).max(80)).max(20).optional(),
  updated_since: Rfc3339DateTimeSchema.optional()
}).strict();

export const AdsInsightsMetricSchema = z.enum([
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
]);

export const AdsInsightsBreakdownSchema = z.enum([
  "age",
  "gender",
  "country",
  "region",
  "publisher_platform",
  "platform_position"
]);

export const AdsInsightsQueryInputSchema = PaginationInputSchema.extend({
  ad_account_id: MetaIdSchema,
  level: z.enum(["account", "campaign", "ad_set", "ad"]),
  time_range: TimeRangeSchema,
  metrics: z.array(AdsInsightsMetricSchema).min(1).max(20),
  breakdowns: z.array(AdsInsightsBreakdownSchema).max(2).optional(),
  time_increment: z.enum(["all_days", "1", "7", "monthly"]).optional()
}).strict();

export const PagesListInputSchema = PaginationInputSchema.extend({
  connection_id: MetaIdSchema.optional()
}).strict();

export const InstagramAccountsListInputSchema = PaginationInputSchema.extend({
  connection_id: MetaIdSchema.optional(),
  page_id: MetaIdSchema.optional()
}).strict();

export const SearchInputSchema = z.object({
  query: z.string().min(1).max(300),
  filters: z.object({
    source_types: z.array(z.enum(["ad_account", "campaign", "insights", "page", "instagram_account", "proposal"])).max(10).optional(),
    asset_ids: z.array(MetaIdSchema).max(50).optional(),
    since: IsoDateSchema.optional(),
    until: IsoDateSchema.optional()
  }).strict().optional(),
  limit: z.number().int().min(1).max(20).optional()
}).strict();

export const FetchInputSchema = z.object({
  id: z.string().min(1).max(300)
}).strict();

export const ProposalRiskClassSchema = z.enum([
  "operational",
  "public",
  "financial",
  "destructive"
]);

export const BudgetProposalInputSchema = z.object({
  target_type: z.enum(["campaign", "ad_set"]),
  target_id: MetaIdSchema,
  budget_type: z.enum(["daily", "lifetime"]),
  amount_minor: MinorUnitMoneySchema,
  currency: CurrencyCodeSchema,
  reason: z.string().min(1).max(1000),
  expires_in_seconds: z.number().int().min(300).max(604800).optional()
}).strict();

export const DeliveryStatusProposalInputSchema = z.object({
  target_type: z.enum(["campaign", "ad_set", "ad"]),
  target_id: MetaIdSchema,
  proposed_status: z.enum(["ACTIVE", "PAUSED"]),
  reason: z.string().min(1).max(1000),
  expires_in_seconds: z.number().int().min(300).max(604800).optional()
}).strict();

export const ToolAnnotationsSchema = z.object({
  readOnlyHint: z.boolean(),
  destructiveHint: z.boolean(),
  openWorldHint: z.boolean()
}).strict();

export type ToolAnnotations = z.infer<typeof ToolAnnotationsSchema>;

export type ToolContract = {
  title: string;
  description: string;
  inputSchema: z.ZodType;
  annotations: ToolAnnotations;
};

const readExternal: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true
};

const readLocal: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false
};

const writeLocal: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  openWorldHint: false
};

export const ToolContracts = {
  meta_connection_status: {
    title: "Meta connection status",
    description: "Report configured connection status and effective capabilities without returning tokens.",
    inputSchema: ConnectionStatusInputSchema,
    annotations: readLocal
  },
  meta_ad_accounts_list: {
    title: "List Meta ad accounts",
    description: "List allowlisted ad accounts visible to the configured Meta connection.",
    inputSchema: AdAccountsListInputSchema,
    annotations: readExternal
  },
  meta_campaigns_list: {
    title: "List Meta campaigns",
    description: "List allowlisted campaigns for an ad account using bounded filters.",
    inputSchema: CampaignsListInputSchema,
    annotations: readExternal
  },
  meta_ads_insights_query: {
    title: "Query Meta ads insights",
    description: "Query bounded ad insights with an allowlisted metric and breakdown catalog.",
    inputSchema: AdsInsightsQueryInputSchema,
    annotations: readExternal
  },
  meta_pages_list: {
    title: "List Facebook Pages",
    description: "List allowlisted Facebook Pages and high-level capability status.",
    inputSchema: PagesListInputSchema,
    annotations: readExternal
  },
  meta_instagram_accounts_list: {
    title: "List Instagram business accounts",
    description: "List allowlisted professional Instagram accounts connected to configured Pages.",
    inputSchema: InstagramAccountsListInputSchema,
    annotations: readExternal
  },
  search: {
    title: "Search sanitized Meta snapshots",
    description: "Search sanitized cached documents. This skeleton does not index live Meta data yet.",
    inputSchema: SearchInputSchema,
    annotations: readLocal
  },
  fetch: {
    title: "Fetch sanitized Meta snapshot",
    description: "Fetch a sanitized cached document by ID. This skeleton does not index live Meta data yet.",
    inputSchema: FetchInputSchema,
    annotations: readLocal
  },
  meta_proposal_create_budget_change: {
    title: "Create budget change proposal",
    description: "Create a local proposal for a future budget change. It never changes Meta state.",
    inputSchema: BudgetProposalInputSchema,
    annotations: writeLocal
  },
  meta_proposal_create_delivery_status_change: {
    title: "Create delivery status proposal",
    description: "Create a local proposal for a future delivery status change. It never changes Meta state.",
    inputSchema: DeliveryStatusProposalInputSchema,
    annotations: writeLocal
  }
} satisfies Record<string, ToolContract>;

export type ToolName = keyof typeof ToolContracts;

export const ForbiddenToolNames = [
  "meta_graph_request",
  "meta_api_call",
  "meta_export_access_token",
  "meta_debug_token_raw",
  "meta_approve_proposal",
  "meta_set_budget",
  "meta_pause",
  "meta_activate",
  "meta_delete"
] as const;

export function assertNoForbiddenToolNames(toolNames: readonly string[]): void {
  const forbidden = toolNames.filter((name) =>
    (ForbiddenToolNames as readonly string[]).includes(name)
  );
  if (forbidden.length > 0) {
    throw new Error(`Forbidden tool names registered: ${forbidden.join(", ")}`);
  }
}

export function skeletonSafeError(toolName: string): SafeError {
  return {
    error: {
      code: "DATA_UNAVAILABLE",
      safe_message: `${toolName} is scaffolded but has no live Meta integration in this public skeleton.`,
      retryable: false,
      remediation: "Wire an allowlisted Meta operation and mocked contract tests before enabling live calls."
    }
  };
}
