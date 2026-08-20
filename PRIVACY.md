# Privacy Notice

Last updated: August 20, 2026

Meta Business MCP is an independent, local-first open-source tool published by Guangyu Song. It is not affiliated with, endorsed by, or sponsored by Meta, Anthropic, or OpenAI.

## Data flow

The desktop extension runs on your computer. It connects directly to Meta's Graph API using the access token and explicit asset allowlists you configure. The publisher does not operate a backend for the desktop extension and does not receive your token, Meta Business data, tool inputs, or tool outputs.

Your MCP client may process tool inputs and outputs under that client's own privacy terms. Meta processes API requests under its own terms and privacy policy.

## Local storage

The extension may store sanitized snapshots and proposal records in `~/.meta-business-mcp` so its local `search` and `fetch` tools can work. Raw Meta access tokens are not written to that storage directory by the extension. Local records remain until you delete them.

## Telemetry

The extension does not include publisher-operated analytics, advertising, telemetry, or crash reporting.

## Your controls

You can stop processing by disabling or uninstalling the extension. You can delete locally stored records by removing `~/.meta-business-mcp`. You can revoke the access token through the Meta account or developer-app controls that issued it.

## Support

For privacy questions, email <support@guangyusong.com>. General bugs and feature requests may be opened at <https://github.com/guangyusong/meta-business-mcp/issues>.

Do not include access tokens, account data, personal data, or security vulnerabilities in a public issue or ordinary support email.

Security vulnerabilities should be reported through GitHub private vulnerability reporting at <https://github.com/guangyusong/meta-business-mcp/security/advisories/new>.
