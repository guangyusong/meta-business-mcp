# MCP Inspector Smoke Test

The server currently registers tools over stdio and returns safe skeleton responses.

After installing dependencies and building:

```sh
npm install
npm run build
npx @modelcontextprotocol/inspector node apps/server/dist/index.js --transport stdio
```

Expected behavior:

- The initial tool list appears.
- Calling any tool returns a structured `DATA_UNAVAILABLE` response.
- No live Meta credential is required.
- No Meta write or raw Graph tool appears.

This smoke test is documented but not required in CI until live tool handlers are added.
