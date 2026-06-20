# Tool Reference

The tool contracts exist now; live Meta execution does not.

## Read tools

- `meta_connection_status`: reports configured connection and effective capability status without returning tokens.
- `meta_ad_accounts_list`: lists allowlisted ad accounts.
- `meta_campaigns_list`: lists campaigns for an allowlisted ad account.
- `meta_ads_insights_query`: queries bounded insight metrics and breakdowns.
- `meta_pages_list`: lists Facebook Pages.
- `meta_instagram_accounts_list`: lists professional Instagram accounts.
- `search`: searches sanitized cached snapshots.
- `fetch`: fetches one sanitized cached snapshot.

## Proposal tools

- `meta_proposal_create_budget_change`: creates a local proposal for a future budget change.
- `meta_proposal_create_delivery_status_change`: creates a local proposal for a future delivery status change.

Proposal tools must never execute Meta changes. Execution tools must accept only a `proposal_id` in a future security-reviewed milestone.

## Forbidden tools

These must not be added in v1:

- `meta_graph_request`
- `meta_api_call`
- `meta_export_access_token`
- `meta_debug_token_raw`
- `meta_approve_proposal`
- direct `set_budget`, `pause`, `activate`, or `delete`
- posting, messaging, WhatsApp, browser automation, arbitrary URL fetch, or bulk lead export
