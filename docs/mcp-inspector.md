# MCP Inspector Smoke Test

The server registers tools over stdio. Live read tools can call allowlisted Meta APIs when explicitly configured.

After installing dependencies and building:

```sh
npm install
npm run build
npx @modelcontextprotocol/inspector node apps/server/dist/index.js --transport stdio
```

Expected behavior:

- The initial tool list appears.
- Without live config, asset-bound tools report missing configuration or empty allowlists.
- With live config, Ads, Pages, Instagram, lead form metadata, and insights tools can return live allowlisted data.
- `search` and `fetch` return sanitized cached snapshots after read/proposal tools populate storage.
- No live Meta credential is required for the smoke test to start.
- No raw Graph tool appears.
- Proposal tools appear, but `meta_proposal_execute` returns `POLICY_DENIED` unless writes are explicitly enabled in a private runtime.

Live credential checks remain opt-in and must not run in CI by default:

```sh
META_BUSINESS_MCP_LIVE_TEST=1 npm run smoke:live
```
