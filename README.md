# Meta Business MCP

Meta Business MCP is an open-source-ready skeleton for an auditable Model Context Protocol gateway over Meta Business APIs.

The goal is not to build an autonomous marketing agent. The goal is a safe, self-hosted operations gateway that can eventually let MCP clients inspect Meta Business assets, normalize performance data, and create reviewable proposals without exposing broad Graph API access.

This project is not affiliated with, endorsed by, or sponsored by Meta or OpenAI.

## Current status

This repository is a public skeleton. It intentionally does not call live Meta APIs yet.

Included:

- TypeScript workspace with strict builds.
- Initial MCP tool contracts.
- Real stdio MCP server entrypoint.
- Default-safe policy primitives.
- Allowlisted Meta API boundary.
- Proposal hashing and state-transition primitives.
- Audit redaction helpers.
- Docs, examples, and tests.

Excluded from v1:

- Meta writes.
- Posting, messaging, WhatsApp, deletes, budget changes, or campaign activation.
- Raw lead export or lead PII retrieval.
- Generic `graph_request`, `meta_api_call`, arbitrary URL fetch, or browser automation.
- Clara-specific prompts, account IDs, workflows, thresholds, CRM integrations, or private playbooks.

## Tool contracts

Initial contracts:

- `meta_connection_status`
- `meta_ad_accounts_list`
- `meta_campaigns_list`
- `meta_ads_insights_query`
- `meta_pages_list`
- `meta_instagram_accounts_list`
- `search`
- `fetch`
- `meta_proposal_create_budget_change`
- `meta_proposal_create_delivery_status_change`

Every handler currently returns a safe skeleton response until an allowlisted Meta operation and mocked contract tests exist.

## Development

```sh
npm install
npm run typecheck
npm test
npm run build
```

Run the stdio server skeleton:

```sh
npm --workspace @meta-business-mcp/server run dev:stdio
```

Install it in Codex:

```sh
codex mcp add meta-business -- \
  npm --prefix /absolute/path/to/meta-business-mcp \
  --workspace @meta-business-mcp/server \
  run dev:stdio
```

See [docs/install.md](docs/install.md) for Codex and ChatGPT setup notes.

## Security defaults

- Read-only by default.
- No raw Meta token in tool arguments or outputs.
- No generic Graph proxy.
- No live credentials required for tests.
- No lead values in the skeleton.
- No Meta mutation methods in the allowlisted client boundary.

See [docs/threat-model.md](docs/threat-model.md) and [docs/architecture.md](docs/architecture.md).
