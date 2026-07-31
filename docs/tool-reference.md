# Tool Reference

The server exposes allowlisted Meta read tools, sanitized local `search`/`fetch`, and proposal/approval tools. It does not expose arbitrary Graph requests.

## Read Tools

- `meta_connection_status`: checks token presence, `/me`, `/debug_token`, configured ad accounts, and configured Pages without returning tokens.
- `meta_ad_accounts_list`: lists explicitly allowlisted ad accounts.
- `meta_campaigns_list`: lists campaigns for an allowlisted ad account.
- `meta_adsets_list`: lists ad sets for an allowlisted ad account or campaign.
- `meta_ads_list`: lists ads for an allowlisted ad account, campaign, or ad set.
- `meta_ad_creatives_list`: lists ad creatives for an allowlisted ad account.
- `meta_pixels_list`: lists pixels filtered to the explicit pixel allowlist.
- `meta_custom_conversions_list`: lists custom conversions for an allowlisted ad account.
- `meta_ads_insights_query`: queries bounded ads insights for allowlisted metrics, breakdowns, and date ranges.
- `meta_pages_list`: lists explicitly allowlisted Pages.
- `meta_page_get`: fetches allowlisted Page metadata.
- `meta_page_posts_list`: lists published or scheduled posts for an allowlisted Page.
- `meta_page_post_comments_list`: lists bounded post comments and redacts author identity.
- `meta_page_insights_query`: queries bounded Page insights.
- `meta_page_post_insights_query`: queries bounded post insights.
- `meta_page_conversations_list`: lists conversation metadata only, not message bodies.
- `meta_instagram_accounts_list`: lists linked professional Instagram account metadata for allowlisted Pages.
- `meta_instagram_media_list`: lists metadata for an allowlisted Instagram account.
- `meta_instagram_media_insights_query`: queries bounded media insights for an allowlisted Instagram account.
- `meta_lead_forms_list`: lists lead form metadata and aggregate counts only; raw leads are disabled.
- `meta_allowed_assets_list`: returns configured asset allowlists and policy boundaries.
- `meta_permission_probe`: probes safe read capabilities for configured assets.
- `meta_token_health_check`: checks token validity, type, scopes, and expiry metadata.

## Local Context Tools

- `search`: searches sanitized cached Meta/proposal snapshots.
- `fetch`: fetches one sanitized cached document by ID.

Snapshots include provenance, asset scope, data classification, and redaction status. Tokens, secrets, emails, and phone-like values are redacted before storage/output.

## Proposal Tools

- `meta_proposal_create_budget_change`: creates a local proposal for a campaign/ad set budget change.
- `meta_proposal_create_delivery_status_change`: creates a local proposal for campaign/ad set/ad activation or pause.
- `meta_proposal_create_page_post`: creates a local proposal for a Page post or scheduled post.
- `meta_proposal_create_comment_reply`: creates a local proposal for a Page comment reply.
- `meta_proposal_create_message_reply`: creates a local proposal for a Page message reply draft.
- `meta_proposals_list`: lists local proposals.
- `meta_proposal_get`: fetches one proposal.
- `meta_proposal_cancel`: cancels a proposal before terminal state.
- `meta_proposal_approve`: approves a proposal by exact `proposal_hash`.
- `meta_proposal_execute`: executes one approved proposal by `proposal_id` only.

Execution is disabled unless `META_BUSINESS_MCP_WRITES_ENABLED=1` is set in a private reviewed runtime. Execution never accepts free-form write arguments.

## Live Configuration

Required for live Meta tools:

- `META_ADS_TOKEN`: Meta token with access to configured assets.
- At least one explicit asset allowlist:
  - `META_BUSINESS_MCP_AD_ACCOUNTS_FILE`, `META_BUSINESS_MCP_AD_ACCOUNTS_JSON`, or `META_AD_ACCOUNT_IDS`
  - `META_BUSINESS_MCP_PAGES_FILE`, `META_BUSINESS_MCP_PAGES_JSON`, or `META_PAGE_IDS`
  - `META_BUSINESS_MCP_INSTAGRAM_ACCOUNTS_FILE`, `META_BUSINESS_MCP_INSTAGRAM_ACCOUNTS_JSON`, or `META_INSTAGRAM_ACCOUNT_IDS`
  - `META_BUSINESS_MCP_PIXELS_FILE`, `META_BUSINESS_MCP_PIXELS_JSON`, or `META_PIXEL_IDS`

Optional:

- `META_ADS_API_VERSION`: defaults to the package default.
- `META_BUSINESS_MCP_TIMEOUT_MS`: defaults to `20000`.
- `META_BUSINESS_MCP_STORAGE_DIR`: sanitized cache/proposal storage directory.
- `META_BUSINESS_MCP_MAX_BUDGET_CHANGE_PERCENT`: default `25`.
- `META_BUSINESS_MCP_WRITES_ENABLED`: default disabled.

## Safe Errors

Handlers return structured safe errors instead of raw upstream responses:

- `AUTH_REQUIRED`
- `TOKEN_EXPIRED`
- `INSUFFICIENT_SCOPE`
- `ASSET_NOT_ALLOWED`
- `INVALID_QUERY`
- `INVALID_CURSOR`
- `RATE_LIMITED`
- `UPSTREAM_TRANSIENT`
- `DATA_UNAVAILABLE`
- `PII_POLICY_DENIED`
- `POLICY_DENIED`
- `STALE_PROPOSAL`
- `PRECONDITION_FAILED`
- `APPROVAL_REQUIRED`
- `APPROVAL_EXPIRED`
- `AMBIGUOUS_UPSTREAM_RESULT`

## Forbidden Tools

These must not be added:

- `meta_graph_request`
- `meta_api_call`
- `meta_export_access_token`
- `meta_debug_token_raw`
- direct `meta_set_budget`, `meta_pause`, `meta_activate`, or `meta_delete`
- arbitrary URL fetch
- browser automation
- bulk/raw lead export
