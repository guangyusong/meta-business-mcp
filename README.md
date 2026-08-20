# Meta Business MCP

![Meta Business MCP icon](assets/icon.png)

Meta Business MCP is an open-source-ready Model Context Protocol gateway over allowlisted Meta Business APIs.

Published and maintained by [Guangyu Song](https://github.com/guangyusong).

The goal is not to build an autonomous marketing agent. The goal is a safe, self-hosted operations gateway that lets MCP clients inspect Meta Business assets, normalize performance data, draft/propose changes, and execute only explicitly approved named actions without exposing broad Graph API access.

This project is not affiliated with, endorsed by, or sponsored by Meta, Anthropic, or OpenAI.

## Current status

This repository has a local stdio MCP server for Codex, a Streamable HTTP `/mcp` path for remote MCP clients, broad live read handlers, sanitized local search/fetch, and durable proposal state.

Included:

- TypeScript workspace with strict builds.
- Broad MCP tool contracts for Ads, Pages, Instagram, leads metadata, health/context, search/fetch, and proposals.
- Real stdio MCP server entrypoint.
- Streamable HTTP MCP server entrypoint with OAuth bearer verification hooks.
- Default-safe policy primitives.
- Allowlisted Meta API client boundary.
- Proposal hashing, approval, and execution state.
- Audit redaction helpers.
- Docs, examples, and tests.

Live when configured:

- `meta_connection_status`
- `meta_ad_accounts_list`
- `meta_campaigns_list`
- `meta_adsets_list`
- `meta_ads_list`
- `meta_ad_creatives_list`
- `meta_pixels_list`
- `meta_custom_conversions_list`
- `meta_ads_insights_query`
- `meta_pages_list`
- `meta_page_get`
- `meta_page_posts_list`
- `meta_page_post_comments_list`
- `meta_page_insights_query`
- `meta_page_post_insights_query`
- `meta_page_conversations_list`
- `meta_instagram_accounts_list`
- `meta_instagram_media_list`
- `meta_instagram_media_insights_query`
- `meta_lead_forms_list`
- `meta_allowed_assets_list`
- `meta_permission_probe`
- `meta_token_health_check`
- `search`
- `fetch`
- proposal create/list/get/cancel/approve tools

Implemented for private development but not advertised by the default public policy:

- `meta_proposal_execute` contains guarded execution code for approved named proposals.
- The default public policy excludes this tool from the MCP registry, even if a write environment variable is set.
- External writes require a later, separately reviewed private policy and are not part of the first directory release.

Excluded by default:

- Arbitrary Graph proxy tools.
- Deletes, WhatsApp, raw lead export, browser automation, and arbitrary URL fetch.
- Raw lead export or lead PII retrieval.
- Company-specific prompts, account IDs, workflows, thresholds, CRM integrations, or private playbooks.

## Tool contracts

See [docs/tool-reference.md](docs/tool-reference.md) for the current tool list, schemas, and safety behavior. Live Meta tools require `META_ADS_TOKEN` plus explicit asset allowlists.

## Configuration

The server reads credentials and allowlists from environment/config only. Do not pass tokens as tool arguments.

```sh
export META_ADS_TOKEN="EAAR_fake_replace_me"
export META_ADS_API_VERSION="v25.0"
export META_BUSINESS_MCP_AD_ACCOUNTS_FILE="/private/path/ad-accounts.json"
export META_BUSINESS_MCP_PAGES_FILE="/private/path/pages.json"
export META_BUSINESS_MCP_INSTAGRAM_ACCOUNTS_FILE="/private/path/instagram-accounts.json"
```

Allowlist file format:

```json
{
  "accounts": [
    {
      "account_id": "act_1234567890",
      "account_name": "Example Account",
      "status": "active"
    }
  ]
}
```

Alternatives:

- `META_BUSINESS_MCP_AD_ACCOUNTS_JSON`: inline JSON in the same shape.
- `META_AD_ACCOUNT_IDS`: comma-separated account IDs for simple local testing.
- `META_BUSINESS_MCP_PAGES_JSON` / `META_PAGE_IDS`: Page allowlist.
- `META_BUSINESS_MCP_INSTAGRAM_ACCOUNTS_JSON` / `META_INSTAGRAM_ACCOUNT_IDS`: Instagram account allowlist.
- `META_BUSINESS_MCP_PIXELS_JSON` / `META_PIXEL_IDS`: pixel allowlist.
- `META_BUSINESS_MCP_TIMEOUT_MS`: request timeout, default `20000`.
- `META_BUSINESS_MCP_STORAGE_DIR`: local sanitized cache/proposal storage.
- `META_BUSINESS_MCP_WRITES_ENABLED`: opt-in approved execution switch, default off.

For private deployments, keep account allowlists and token sourcing outside this public repo. Point `META_BUSINESS_MCP_AD_ACCOUNTS_FILE` at a private file if needed.

## Development

```sh
npm install
npm run typecheck
npm test
npm run build
```

Build and validate the Claude Desktop MCP bundle:

```sh
npm run mcpb:validate
npm run mcpb:pack
```

The generated `.mcpb` artifact is written under `dist/` and is not committed.

Run the stdio server:

```sh
npm --workspace @meta-business-mcp/server run dev:stdio
```

Run the HTTP server locally:

```sh
npm --workspace @meta-business-mcp/server run dev:http
```

For ChatGPT or other remote MCP clients, deploy the HTTP server behind HTTPS and enable:

```sh
export META_BUSINESS_MCP_HTTP_AUTH_ENABLED=1
export META_BUSINESS_MCP_AUTH_ISSUER="https://issuer.example"
export META_BUSINESS_MCP_AUTH_AUDIENCE="https://your-domain.example/mcp"
export META_BUSINESS_MCP_AUTH_JWKS_URL="https://issuer.example/.well-known/jwks.json"
export META_BUSINESS_MCP_AUTH_REQUIRED_SCOPES="meta_business.read,meta_business.write"
export META_BUSINESS_MCP_ALLOWED_ORIGINS="https://chatgpt.com"
```

Run the opt-in live smoke test:

```sh
META_BUSINESS_MCP_LIVE_TEST=1 npm run smoke:live
```

The live smoke test is skipped unless `META_BUSINESS_MCP_LIVE_TEST=1` is set and prints redacted JSON.

Install it in Codex:

```sh
codex mcp add meta-business -- \
  npm --prefix /absolute/path/to/meta-business-mcp \
  --workspace @meta-business-mcp/server \
  run dev:stdio
```

See [docs/install.md](docs/install.md) for Codex and ChatGPT setup notes.

## Directory release status

- Claude Desktop: version 0.1.1 has been installed and exercised in Claude Desktop on macOS. GitHub Actions builds, packages, and performs the MCP runtime handshake on macOS, Windows, and Linux. Each user supplies their own Meta token and explicit asset allowlists.
- Anthropic directory: prepared but not submitted. Remaining gates are a fully populated reviewer Meta account and end-to-end evidence for every advertised tool.
- OpenAI public directory: not ready. The current HTTP path is for private deployment and uses server-side configuration; a public listing requires per-user Meta OAuth, tenant-isolated storage, a production HTTPS endpoint, domain verification, and reviewer credentials.

See [docs/directory-submission.md](docs/directory-submission.md) for the draft listing packet and review cases.

## Privacy Policy

The desktop extension is local-first and does not send credentials or Meta Business data to a publisher-operated backend. Read the complete [Privacy Notice](PRIVACY.md) for data flow, local storage, retention, sharing, and user-control details.

Privacy questions can be sent to [support@guangyusong.com](mailto:support@guangyusong.com). Do not send access tokens, account data, or security vulnerabilities by ordinary email.

## Support

- General and privacy support: [support@guangyusong.com](mailto:support@guangyusong.com)
- Bugs and feature requests: [GitHub Issues](https://github.com/guangyusong/meta-business-mcp/issues)
- Security vulnerabilities: use [GitHub private vulnerability reporting](https://github.com/guangyusong/meta-business-mcp/security/advisories/new)

## Security defaults

- Meta writes disabled by default.
- Draft/proposal operations are local and auditable.
- Execution accepts only `proposal_id`, never free-form write arguments.
- No raw Meta token in tool arguments or outputs.
- No generic Graph proxy.
- No external mutation tool advertised by the default public policy.
- No live credentials required for tests.
- No raw lead values.

See [docs/threat-model.md](docs/threat-model.md) and [docs/architecture.md](docs/architecture.md).
