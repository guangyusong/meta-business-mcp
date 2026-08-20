# Install

## Recommended path: Codex first

Use Codex first because this project exposes a stdio MCP server and does not require public hosting. ChatGPT requires a remote HTTPS Streamable HTTP endpoint and OAuth for production use.

From a local clone:

```sh
git clone https://github.com/guangyusong/meta-business-mcp.git
cd meta-business-mcp
npm install
npm run build
```

Add it to Codex:

```sh
codex mcp add meta-business -- \
  npm --prefix "$PWD" \
  --workspace @meta-business-mcp/server \
  run dev:stdio
```

Check the configured server:

```sh
codex mcp get meta-business
codex mcp list
```

After adding the server, start a new Codex thread or restart Codex so the MCP server is loaded into the tool set.

Expected behavior without Meta configuration:

- The server advertises tool contracts.
- Meta Ads read tools report missing configuration or empty allowlists.
- Asset-bound tools return empty allowlist or safe policy errors.
- No live Meta credential is required.
- No generic Graph tool exists.
- Meta execution is disabled by default.

Expected behavior with Meta configuration:

- `meta_connection_status` checks the configured token and allowlisted assets.
- `meta_ad_accounts_list` returns only allowlisted visible ad accounts.
- Ads, Pages, Instagram, lead form metadata, and insights tools call named allowlisted Graph endpoints.
- `search` and `fetch` operate over sanitized local snapshots created by read/proposal tools.
- Proposal tools create auditable local proposal records.

Example local environment:

```sh
export META_ADS_TOKEN="EAAR_fake_replace_me"
export META_ADS_API_VERSION="v25.0"
export META_BUSINESS_MCP_AD_ACCOUNTS_FILE="/private/path/ad-accounts.json"
export META_BUSINESS_MCP_PAGES_FILE="/private/path/pages.json"
export META_BUSINESS_MCP_INSTAGRAM_ACCOUNTS_FILE="/private/path/instagram-accounts.json"
export META_BUSINESS_MCP_STORAGE_DIR="/private/path/meta-business-mcp-store"
```

Run a redacted live smoke test:

```sh
META_BUSINESS_MCP_LIVE_TEST=1 npm run smoke:live
```

Remove it:

```sh
codex mcp remove meta-business
```

## ChatGPT path

ChatGPT and other remote MCP clients should connect to a deployed HTTPS endpoint, usually `/mcp`.

The current HTTP implementation is intended for a private single-operator deployment. Do not submit or deploy it as a public multi-user directory server: it uses server-side Meta credentials and a shared configured storage directory rather than per-user Meta OAuth and tenant-isolated storage.

Local HTTP development:

```sh
npm --workspace @meta-business-mcp/server run dev:http
```

Production/private deployment should set:

```sh
export META_BUSINESS_MCP_HTTP_AUTH_ENABLED=1
export META_BUSINESS_MCP_PUBLIC_BASE_URL="https://your-domain.example"
export META_BUSINESS_MCP_AUTH_ISSUER="https://issuer.example"
export META_BUSINESS_MCP_AUTH_AUDIENCE="https://your-domain.example/mcp"
export META_BUSINESS_MCP_AUTH_JWKS_URL="https://issuer.example/.well-known/jwks.json"
export META_BUSINESS_MCP_AUTH_REQUIRED_SCOPES="meta_business.read,meta_business.write"
export META_BUSINESS_MCP_ALLOWED_ORIGINS="https://chatgpt.com"
```

HTTP endpoints:

- `POST /mcp`: Streamable HTTP MCP.
- `GET /mcp`: Streamable HTTP session/SSE handling.
- `GET /healthz`: basic server status.
- `GET /.well-known/oauth-protected-resource/mcp`: protected resource metadata.

Do not expose a no-auth HTTP server with live Meta data. The default public policy does not register the external proposal-execution tool. A future write-enabled private policy requires a separate review of proposal approval, budget caps, state checks, audit storage, and reconciliation handling.
