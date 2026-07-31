# Local stdio example

This example runs the MCP server locally over stdio.

```sh
npm install
npm --workspace @meta-business-mcp/server run dev:stdio
```

No Meta credential is required for startup or tests.

To enable live reads:

```sh
export META_ADS_TOKEN="EAAR_fake_replace_me"
export META_ADS_API_VERSION="v25.0"
export META_BUSINESS_MCP_AD_ACCOUNTS_FILE="$PWD/examples/local-stdio/ad-accounts.example.json"
export META_PAGE_IDS="fake_page_123"
export META_INSTAGRAM_ACCOUNT_IDS="fake_ig_123"
npm --workspace @meta-business-mcp/server run dev:stdio
```

Replace the fake token and fake account IDs with private values from your own environment. Do not commit live credentials or production account allowlists.

For local HTTP testing:

```sh
npm --workspace @meta-business-mcp/server run dev:http
```

Do not expose local no-auth HTTP with live Meta data. Use the OAuth/JWKS settings in `docs/install.md` for remote clients.
