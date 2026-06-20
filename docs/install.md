# Install

## Recommended path: Codex first

Use Codex first because this project currently exposes a stdio MCP server. ChatGPT requires a remote Streamable HTTP endpoint, OAuth, and HTTPS hosting; the HTTP transport is intentionally disabled in the skeleton.

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

Expected behavior in this skeleton:

- The server advertises tool contracts.
- Tool calls return a safe `DATA_UNAVAILABLE` skeleton response.
- No live Meta credential is required.
- No Meta write or generic Graph tool exists.

Remove it:

```sh
codex mcp remove meta-business
```

## ChatGPT path: later

ChatGPT connector setup should wait until the server has a Streamable HTTP transport.

Required future work:

1. Implement Streamable HTTP at `/mcp`.
2. Add OAuth authorization code + PKCE for remote clients.
3. Validate issuer, audience, expiration, and scopes on every request.
4. Add Origin validation and request limits.
5. Host behind HTTPS.
6. Use ChatGPT developer mode to create a connector using the public `/mcp` URL.

Do not expose a no-auth HTTP server with live Meta data. The skeleton can be demoed locally through Codex without live credentials.
