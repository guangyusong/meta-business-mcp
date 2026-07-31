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
  limit: z.number().int().min(1).max(100).optional()
    .describe("Maximum number of records to return, from 1 to 100."),
  after: CursorSchema.optional()
    .describe("Opaque next-page cursor returned by a previous call to this tool.")
}).strict();

export const TimeRangeSchema = z.object({
  since: IsoDateSchema.describe("Inclusive start date in YYYY-MM-DD format."),
  until: IsoDateSchema.describe("Inclusive end date in YYYY-MM-DD format.")
}).strict().describe("Inclusive reporting date range; since must not be later than until.");

export const ConnectionStatusInputSchema = z.object({
  connection_id: MetaIdSchema.optional()
    .describe("Optional configured connection identifier; omit to inspect the default connection.")
}).strict();

export const AdAccountsListInputSchema = PaginationInputSchema.extend({
  connection_id: MetaIdSchema.optional()
    .describe("Optional configured connection identifier; omit to use the default connection.")
}).strict();

export const CampaignsListInputSchema = PaginationInputSchema.extend({
  ad_account_id: MetaIdSchema.describe("Allowlisted Meta ad account ID, including the act_ prefix."),
  effective_status: z.array(z.enum(["ACTIVE", "PAUSED", "DELETED", "ARCHIVED", "IN_PROCESS", "WITH_ISSUES"])).max(10).optional()
    .describe("Optional campaign delivery states to include."),
  objective: z.array(z.string().min(1).max(80)).max(20).optional()
    .describe("Optional Meta campaign objective names to include."),
  updated_since: Rfc3339DateTimeSchema.optional()
    .describe("Return campaigns updated at or after this RFC 3339 timestamp.")
}).strict();

export const AdSetsListInputSchema = PaginationInputSchema.extend({
  ad_account_id: MetaIdSchema.describe("Allowlisted Meta ad account ID, including the act_ prefix."),
  campaign_id: MetaIdSchema.optional()
    .describe("Optional campaign ID used to restrict results to one campaign."),
  effective_status: z.array(z.enum(["ACTIVE", "PAUSED", "DELETED", "ARCHIVED", "IN_PROCESS", "WITH_ISSUES"])).max(10).optional()
    .describe("Optional ad set delivery states to include.")
}).strict();

export const AdsListInputSchema = PaginationInputSchema.extend({
  ad_account_id: MetaIdSchema.describe("Allowlisted Meta ad account ID, including the act_ prefix."),
  campaign_id: MetaIdSchema.optional()
    .describe("Optional campaign ID used to restrict results to one campaign."),
  adset_id: MetaIdSchema.optional()
    .describe("Optional ad set ID used to restrict results to one ad set."),
  effective_status: z.array(z.enum(["ACTIVE", "PAUSED", "DELETED", "ARCHIVED", "IN_PROCESS", "WITH_ISSUES"])).max(10).optional()
    .describe("Optional ad delivery states to include.")
}).strict();

export const AdCreativesListInputSchema = PaginationInputSchema.extend({
  ad_account_id: MetaIdSchema.describe("Allowlisted Meta ad account ID, including the act_ prefix.")
}).strict();

export const PixelsListInputSchema = PaginationInputSchema.extend({
  ad_account_id: MetaIdSchema.describe("Allowlisted Meta ad account ID, including the act_ prefix.")
}).strict();

export const CustomConversionsListInputSchema = PaginationInputSchema.extend({
  ad_account_id: MetaIdSchema.describe("Allowlisted Meta ad account ID, including the act_ prefix.")
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
  ad_account_id: MetaIdSchema.describe("Allowlisted Meta ad account ID, including the act_ prefix."),
  level: z.enum(["account", "campaign", "ad_set", "ad"])
    .describe("Aggregation level for each returned insight row."),
  time_range: TimeRangeSchema.describe("Inclusive reporting date range."),
  metrics: z.array(AdsInsightsMetricSchema).min(1).max(20)
    .describe("One or more allowlisted Meta insight metrics to return."),
  breakdowns: z.array(AdsInsightsBreakdownSchema).max(2).optional()
    .describe("Up to two demographic or placement dimensions used to split results."),
  time_increment: z.enum(["all_days", "1", "7", "monthly"]).optional()
    .describe("Optional time bucket: whole range, daily, seven-day, or monthly.")
}).strict();

export const PagesListInputSchema = PaginationInputSchema.extend({
  connection_id: MetaIdSchema.optional()
    .describe("Optional configured connection identifier; omit to use the default connection.")
}).strict();

export const InstagramAccountsListInputSchema = PaginationInputSchema.extend({
  connection_id: MetaIdSchema.optional()
    .describe("Optional configured connection identifier; omit to use the default connection."),
  page_id: MetaIdSchema.optional()
    .describe("Optional allowlisted Facebook Page ID used to restrict connected Instagram accounts.")
}).strict();

export const PageMetadataInputSchema = z.object({
  page_id: MetaIdSchema.describe("Allowlisted Facebook Page ID.")
}).strict();

export const PagePostsListInputSchema = PaginationInputSchema.extend({
  page_id: MetaIdSchema.describe("Allowlisted Facebook Page ID."),
  include_scheduled: z.boolean().optional()
    .describe("Whether to include scheduled unpublished posts; defaults to false.")
}).strict();

export const PagePostCommentsListInputSchema = PaginationInputSchema.extend({
  post_id: MetaIdSchema.describe("Facebook Page post ID belonging to an allowlisted Page."),
  order: z.enum(["chronological", "reverse_chronological"]).optional()
    .describe("Comment sort order; omit to use the server default.")
}).strict();

export const PageInsightsQueryInputSchema = PaginationInputSchema.extend({
  page_id: MetaIdSchema.describe("Allowlisted Facebook Page ID."),
  metrics: z.array(z.string().min(1).max(100)).min(1).max(20)
    .describe("One or more supported Facebook Page insight metric names."),
  period: z.enum(["day", "week", "days_28", "lifetime"]).optional()
    .describe("Aggregation period supported by the selected Page metrics."),
  since: IsoDateSchema.optional().describe("Inclusive start date in YYYY-MM-DD format."),
  until: IsoDateSchema.optional().describe("Inclusive end date in YYYY-MM-DD format.")
}).strict();

export const PagePostInsightsQueryInputSchema = PaginationInputSchema.extend({
  post_id: MetaIdSchema.describe("Facebook Page post ID belonging to an allowlisted Page."),
  metrics: z.array(z.string().min(1).max(100)).min(1).max(20)
    .describe("One or more supported post insight metric names.")
}).strict();

export const PageConversationsListInputSchema = PaginationInputSchema.extend({
  page_id: MetaIdSchema.describe("Allowlisted Facebook Page ID.")
}).strict();

export const InstagramMediaListInputSchema = PaginationInputSchema.extend({
  instagram_account_id: MetaIdSchema.describe("Allowlisted Instagram professional account ID.")
}).strict();

export const InstagramMediaInsightsInputSchema = PaginationInputSchema.extend({
  instagram_account_id: MetaIdSchema.describe("Allowlisted Instagram professional account ID."),
  media_id: MetaIdSchema.describe("Instagram media ID owned by the specified professional account."),
  metrics: z.array(z.string().min(1).max(100)).min(1).max(20)
    .describe("One or more supported Instagram media insight metric names.")
}).strict();

export const LeadFormsListInputSchema = PaginationInputSchema.extend({
  page_id: MetaIdSchema.describe("Allowlisted Facebook Page ID that owns the lead forms.")
}).strict();

export const AllowedAssetsListInputSchema = z.object({
  connection_id: MetaIdSchema.optional()
    .describe("Optional configured connection identifier; omit to inspect the default connection.")
}).strict();

export const PermissionProbeInputSchema = z.object({
  connection_id: MetaIdSchema.optional()
    .describe("Optional configured connection identifier; omit to probe the default connection.")
}).strict();

export const TokenHealthInputSchema = z.object({
  connection_id: MetaIdSchema.optional()
    .describe("Optional configured connection identifier; omit to check the default connection.")
}).strict();

export const SearchInputSchema = z.object({
  query: z.string().min(1).max(300)
    .describe("Plain-text query matched only against sanitized locally cached documents."),
  filters: z.object({
    source_types: z.array(z.enum([
      "ad_account",
      "campaign",
      "ad_set",
      "ad",
      "creative",
      "insights",
      "page",
      "page_post",
      "page_comment",
      "instagram_account",
      "instagram_media",
      "lead_form",
      "proposal",
      "context"
    ])).max(20).optional().describe("Optional cached document categories to search."),
    asset_ids: z.array(MetaIdSchema).max(50).optional()
      .describe("Optional Meta asset IDs used to restrict cached search results."),
    since: IsoDateSchema.optional().describe("Optional inclusive cached-record start date."),
    until: IsoDateSchema.optional().describe("Optional inclusive cached-record end date.")
  }).strict().optional().describe("Optional local-cache filters; these never broaden Meta API access."),
  limit: z.number().int().min(1).max(20).optional()
    .describe("Maximum number of search matches to return, from 1 to 20.")
}).strict();

export const FetchInputSchema = z.object({
  id: z.string().min(1).max(300)
    .describe("Opaque sanitized document ID returned by the search tool.")
}).strict();

export const ProposalRiskClassSchema = z.enum([
  "operational",
  "public",
  "financial",
  "destructive"
]);

export const BudgetProposalInputSchema = z.object({
  ad_account_id: MetaIdSchema.describe("Allowlisted Meta ad account ID, including the act_ prefix."),
  target_type: z.enum(["campaign", "ad_set"]).describe("Type of Meta object whose budget would change."),
  target_id: MetaIdSchema.describe("Campaign or ad set ID within the specified ad account."),
  budget_type: z.enum(["daily", "lifetime"]).describe("Budget period to propose."),
  amount_minor: MinorUnitMoneySchema
    .describe("Proposed budget as an integer string in the currency's minor unit, for example 1250 for USD 12.50."),
  currency: CurrencyCodeSchema.describe("Three-letter ISO 4217 currency code, for example USD."),
  reason: z.string().min(1).max(1000).describe("Human-readable justification recorded in the audit trail."),
  expires_in_seconds: z.number().int().min(300).max(604800).optional()
    .describe("Proposal lifetime from 300 to 604800 seconds; omit to use the server default.")
}).strict();

export const DeliveryStatusProposalInputSchema = z.object({
  ad_account_id: MetaIdSchema.describe("Allowlisted Meta ad account ID, including the act_ prefix."),
  target_type: z.enum(["campaign", "ad_set", "ad"]).describe("Type of Meta object whose delivery state would change."),
  target_id: MetaIdSchema.describe("Campaign, ad set, or ad ID within the specified ad account."),
  proposed_status: z.enum(["ACTIVE", "PAUSED"]).describe("Delivery state to apply if the proposal is approved and executed."),
  reason: z.string().min(1).max(1000).describe("Human-readable justification recorded in the audit trail."),
  expires_in_seconds: z.number().int().min(300).max(604800).optional()
    .describe("Proposal lifetime from 300 to 604800 seconds; omit to use the server default.")
}).strict();

export const PagePostProposalInputSchema = z.object({
  page_id: MetaIdSchema.describe("Allowlisted Facebook Page ID that would publish the post."),
  message: z.string().min(1).max(63206).describe("Proposed Facebook Page post text."),
  link: z.string().url().max(2048).optional().describe("Optional HTTPS link to attach to the proposed post."),
  scheduled_publish_time: Rfc3339DateTimeSchema.optional()
    .describe("Optional future RFC 3339 publish time; omit to propose immediate publication."),
  reason: z.string().min(1).max(1000).describe("Human-readable justification recorded in the audit trail."),
  expires_in_seconds: z.number().int().min(300).max(604800).optional()
    .describe("Proposal lifetime from 300 to 604800 seconds; omit to use the server default.")
}).strict();

export const CommentReplyProposalInputSchema = z.object({
  page_id: MetaIdSchema.describe("Allowlisted Facebook Page ID that would author the reply."),
  comment_id: MetaIdSchema.describe("Facebook comment ID that would receive the reply."),
  message: z.string().min(1).max(8000).describe("Proposed public reply text."),
  reason: z.string().min(1).max(1000).describe("Human-readable justification recorded in the audit trail."),
  expires_in_seconds: z.number().int().min(300).max(604800).optional()
    .describe("Proposal lifetime from 300 to 604800 seconds; omit to use the server default.")
}).strict();

export const MessageReplyProposalInputSchema = z.object({
  page_id: MetaIdSchema.describe("Allowlisted Facebook Page ID that would send the reply."),
  recipient_id: MetaIdSchema.describe("Existing Page conversation recipient identifier."),
  message: z.string().min(1).max(8000).describe("Proposed private message reply text."),
  reason: z.string().min(1).max(1000).describe("Human-readable justification recorded in the audit trail."),
  expires_in_seconds: z.number().int().min(300).max(604800).optional()
    .describe("Proposal lifetime from 300 to 604800 seconds; omit to use the server default.")
}).strict();

export const ProposalIdInputSchema = z.object({
  proposal_id: MetaIdSchema.describe("Local proposal identifier returned by a proposal creation or list call.")
}).strict();

export const ProposalListInputSchema = z.object({
  status: z.string().min(1).max(80).optional()
    .describe("Optional proposal lifecycle status used to filter local results."),
  limit: z.number().int().min(1).max(100).optional()
    .describe("Maximum number of proposals to return, from 1 to 100.")
}).strict();

export const ProposalApprovalInputSchema = z.object({
  proposal_id: MetaIdSchema.describe("Local proposal identifier to approve."),
  approver_id: z.string().min(1).max(200).describe("Auditable identifier for the human or system granting approval."),
  proposal_hash: z.string().min(1).max(200)
    .describe("Exact immutable hash returned with the proposal, binding approval to its reviewed contents.")
}).strict();

export const ProposalExecuteInputSchema = z.object({
  proposal_id: MetaIdSchema.describe("Approved local proposal identifier to execute."),
  executor_id: z.string().min(1).max(200).describe("Auditable identifier for the human or system requesting execution.")
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
    description: "Use before live Meta calls to verify that the default or named connection is configured. Returns effective capabilities and safe diagnostics from local configuration only; it never returns or validates the raw token.",
    inputSchema: ConnectionStatusInputSchema,
    annotations: readLocal
  },
  meta_ad_accounts_list: {
    title: "List Meta ad accounts",
    description: "Use to discover which explicitly allowlisted ad accounts may be used with other ads tools. Returns bounded account metadata and a pagination cursor; it is read-only and cannot reveal accounts outside the configured allowlist.",
    inputSchema: AdAccountsListInputSchema,
    annotations: readExternal
  },
  meta_campaigns_list: {
    title: "List Meta campaigns",
    description: "Use to inspect campaigns in one allowlisted ad account, optionally filtering by delivery state, objective, or update time. Returns bounded campaign metadata and a pagination cursor; it never changes campaign delivery.",
    inputSchema: CampaignsListInputSchema,
    annotations: readExternal
  },
  meta_adsets_list: {
    title: "List Meta ad sets",
    description: "Use to inspect ad sets in one allowlisted ad account, optionally narrowed to a campaign or delivery state. Returns bounded ad set metadata and a pagination cursor; it never changes budgets, targeting, or delivery.",
    inputSchema: AdSetsListInputSchema,
    annotations: readExternal
  },
  meta_ads_list: {
    title: "List Meta ads",
    description: "Use to inspect ads in one allowlisted ad account, optionally narrowed to a campaign, ad set, or delivery state. Returns bounded ad metadata and a pagination cursor; it never changes creatives or delivery.",
    inputSchema: AdsListInputSchema,
    annotations: readExternal
  },
  meta_ad_creatives_list: {
    title: "List Meta ad creatives",
    description: "Use to inspect creative metadata owned by one allowlisted ad account. Returns a bounded, paginated summary suitable for review; it does not download arbitrary assets, expose tokens, or modify creatives.",
    inputSchema: AdCreativesListInputSchema,
    annotations: readExternal
  },
  meta_pixels_list: {
    title: "List Meta pixels",
    description: "Use to discover tracking pixels visible to one allowlisted ad account before inspecting conversion configuration. Returns bounded pixel metadata and a pagination cursor; it is read-only.",
    inputSchema: PixelsListInputSchema,
    annotations: readExternal
  },
  meta_custom_conversions_list: {
    title: "List Meta custom conversions",
    description: "Use to inspect custom conversion definitions visible to one allowlisted ad account. Returns bounded conversion metadata and a pagination cursor; it does not expose event payloads or modify conversion rules.",
    inputSchema: CustomConversionsListInputSchema,
    annotations: readExternal
  },
  meta_ads_insights_query: {
    title: "Query Meta ads insights",
    description: "Use for performance reporting across an allowlisted ad account at account, campaign, ad set, or ad level. Returns only allowlisted metrics for a bounded date range, with optional breakdowns and pagination; it is read-only and may report partial upstream results in response metadata.",
    inputSchema: AdsInsightsQueryInputSchema,
    annotations: readExternal
  },
  meta_pages_list: {
    title: "List Facebook Pages",
    description: "Use to discover which explicitly allowlisted Facebook Pages may be used with Page and Instagram tools. Returns bounded Page metadata, capability status, and a pagination cursor; it cannot reveal unconfigured Pages.",
    inputSchema: PagesListInputSchema,
    annotations: readExternal
  },
  meta_page_get: {
    title: "Get Facebook Page metadata",
    description: "Use when you already have an allowlisted Page ID and need its current metadata. Returns one sanitized Page record; it is read-only and rejects Pages outside the configured allowlist.",
    inputSchema: PageMetadataInputSchema,
    annotations: readExternal
  },
  meta_page_posts_list: {
    title: "List Facebook Page posts",
    description: "Use to review published posts and, when requested, scheduled posts for one allowlisted Facebook Page. Returns bounded post metadata and a pagination cursor; it does not publish, edit, or delete posts.",
    inputSchema: PagePostsListInputSchema,
    annotations: readExternal
  },
  meta_page_post_comments_list: {
    title: "List Facebook post comments",
    description: "Use to review comments on a post owned by an allowlisted Facebook Page. Returns bounded, ordered comment data and a pagination cursor; it does not export lead records, reply, hide, or delete comments.",
    inputSchema: PagePostCommentsListInputSchema,
    annotations: readExternal
  },
  meta_page_insights_query: {
    title: "Query Facebook Page insights",
    description: "Use for aggregate performance reporting on one allowlisted Facebook Page over an optional date range. Returns requested supported metrics with bounded pagination; it is read-only and may report unavailable metrics as safe errors.",
    inputSchema: PageInsightsQueryInputSchema,
    annotations: readExternal
  },
  meta_page_post_insights_query: {
    title: "Query Facebook post insights",
    description: "Use for aggregate performance reporting on a specific post owned by an allowlisted Facebook Page. Returns requested supported post metrics with bounded pagination; it never changes the post.",
    inputSchema: PagePostInsightsQueryInputSchema,
    annotations: readExternal
  },
  meta_page_conversations_list: {
    title: "List Facebook Page conversations",
    description: "Use to discover conversation threads associated with one allowlisted Facebook Page before drafting a reply proposal. Returns bounded conversation metadata and a pagination cursor, but deliberately omits message bodies and does not send messages.",
    inputSchema: PageConversationsListInputSchema,
    annotations: readExternal
  },
  meta_instagram_accounts_list: {
    title: "List Instagram business accounts",
    description: "Use to discover explicitly allowlisted Instagram professional accounts, optionally connected to one configured Facebook Page. Returns bounded account metadata and a pagination cursor; personal and unconfigured accounts are excluded.",
    inputSchema: InstagramAccountsListInputSchema,
    annotations: readExternal
  },
  meta_instagram_media_list: {
    title: "List Instagram media",
    description: "Use to inspect media published by one allowlisted Instagram professional account. Returns bounded media metadata and a pagination cursor; it does not publish, edit, download arbitrary content, or delete media.",
    inputSchema: InstagramMediaListInputSchema,
    annotations: readExternal
  },
  meta_instagram_media_insights_query: {
    title: "Query Instagram media insights",
    description: "Use for performance reporting on one media item owned by an allowlisted Instagram professional account. Returns requested supported metrics with bounded pagination; it is read-only and rejects mismatched account and media identifiers.",
    inputSchema: InstagramMediaInsightsInputSchema,
    annotations: readExternal
  },
  meta_lead_forms_list: {
    title: "List Meta lead forms",
    description: "Use to inventory lead forms owned by one allowlisted Facebook Page and inspect aggregate form metadata. Returns bounded form metadata and counts only; raw leads, answers, contact details, and other lead PII are never returned.",
    inputSchema: LeadFormsListInputSchema,
    annotations: readExternal
  },
  meta_allowed_assets_list: {
    title: "List configured Meta assets",
    description: "Use to understand the server's locally configured trust boundary before selecting IDs for live tools. Returns explicit asset allowlists and effective capability flags from local configuration only; it does not call Meta or reveal credentials.",
    inputSchema: AllowedAssetsListInputSchema,
    annotations: readLocal
  },
  meta_permission_probe: {
    title: "Probe Meta permissions",
    description: "Use to diagnose whether the configured token can perform named read operations on allowlisted assets. Performs bounded, non-mutating Meta checks and returns safe capability results; it never returns the token or probes arbitrary Graph paths.",
    inputSchema: PermissionProbeInputSchema,
    annotations: readExternal
  },
  meta_token_health_check: {
    title: "Check Meta token health",
    description: "Use to diagnose token expiry, granted scopes, token type, and data-access expiry before other live calls. Returns sanitized health metadata from Meta's token inspection flow; it never returns the token or app secret.",
    inputSchema: TokenHealthInputSchema,
    annotations: readExternal
  },
  search: {
    title: "Search sanitized Meta snapshots",
    description: "Use to find previously cached, sanitized Meta snapshots and local proposal context by text. Searches local storage only and returns document summaries with IDs for fetch; it never queries arbitrary URLs, broadens live Meta access, or returns raw credentials.",
    inputSchema: SearchInputSchema,
    annotations: readLocal
  },
  fetch: {
    title: "Fetch sanitized Meta snapshot",
    description: "Use after search to retrieve one sanitized local document by its opaque ID. Reads local storage only and returns a safe snapshot; it cannot fetch URLs, arbitrary files, raw tokens, or uncached Meta data.",
    inputSchema: FetchInputSchema,
    annotations: readLocal
  },
  meta_proposal_create_budget_change: {
    title: "Create budget change proposal",
    description: "Use to draft an auditable daily or lifetime budget change for one allowlisted campaign or ad set. Creates local proposal state and an immutable review hash only; it never changes Meta until separately approved and passed to the guarded execute tool while writes are enabled.",
    inputSchema: BudgetProposalInputSchema,
    annotations: writeLocal
  },
  meta_proposal_create_delivery_status_change: {
    title: "Create delivery status proposal",
    description: "Use to draft an auditable ACTIVE or PAUSED delivery-state change for one allowlisted campaign, ad set, or ad. Creates local proposal state and an immutable review hash only; it never changes Meta until separately approved and passed to the guarded execute tool while writes are enabled.",
    inputSchema: DeliveryStatusProposalInputSchema,
    annotations: writeLocal
  },
  meta_proposal_create_page_post: {
    title: "Create Page post proposal",
    description: "Use to draft an auditable immediate or scheduled post for one allowlisted Facebook Page. Creates local proposal state and an immutable review hash only; it does not publish until separately approved and passed to the guarded execute tool while writes are enabled.",
    inputSchema: PagePostProposalInputSchema,
    annotations: writeLocal
  },
  meta_proposal_create_comment_reply: {
    title: "Create comment reply proposal",
    description: "Use to draft an auditable public reply to one Facebook comment on an allowlisted Page. Creates local proposal state and an immutable review hash only; it does not post the reply until separately approved and passed to the guarded execute tool while writes are enabled.",
    inputSchema: CommentReplyProposalInputSchema,
    annotations: writeLocal
  },
  meta_proposal_create_message_reply: {
    title: "Create message reply proposal",
    description: "Use to draft an auditable private reply in an existing conversation for one allowlisted Facebook Page. Creates local proposal state and an immutable review hash only; it does not send the message until separately approved and passed to the guarded execute tool while writes are enabled.",
    inputSchema: MessageReplyProposalInputSchema,
    annotations: writeLocal
  },
  meta_proposals_list: {
    title: "List Meta proposals",
    description: "Use to review locally stored proposals and their draft, approved, cancelled, expired, or execution state. Reads local storage only and can filter by status; it never approves or executes a proposal.",
    inputSchema: ProposalListInputSchema,
    annotations: readLocal
  },
  meta_proposal_get: {
    title: "Get Meta proposal",
    description: "Use to inspect the exact contents, immutable hash, expiry, and lifecycle state of one local proposal before approval or execution. Reads local storage only and does not change proposal or Meta state.",
    inputSchema: ProposalIdInputSchema,
    annotations: readLocal
  },
  meta_proposal_cancel: {
    title: "Cancel Meta proposal",
    description: "Use to prevent a local proposal from being approved or executed when it is no longer desired. Changes only local proposal lifecycle state, is rejected after execution, and never changes Meta state.",
    inputSchema: ProposalIdInputSchema,
    annotations: writeLocal
  },
  meta_proposal_approve: {
    title: "Approve Meta proposal",
    description: "Use only after reviewing a proposal fetched by ID; supply its exact immutable hash to bind approval to those contents. Records local approval and approver identity, but does not execute or otherwise change Meta state.",
    inputSchema: ProposalApprovalInputSchema,
    annotations: writeLocal
  },
  meta_proposal_execute: {
    title: "Execute approved Meta proposal",
    description: "Use only for an unexpired, separately approved proposal after confirming its reviewed contents and current target state. May perform the proposal's single named Meta mutation when writes are explicitly enabled; it rejects free-form operations, unapproved or stale proposals, and ambiguous upstream outcomes.",
    inputSchema: ProposalExecuteInputSchema,
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
      safe_message: `${toolName} has no live Meta integration in this v1 server.`,
      retryable: false,
      remediation: "Add an allowlisted read operation and mocked contract tests before enabling live calls."
    }
  };
}
