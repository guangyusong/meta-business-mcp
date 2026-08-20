# Directory Submission Packet

This document keeps the review copy and evidence for the first directory release together. It is a preparation artifact, not proof that a submission has been sent or accepted.

## Publisher

- Developer identity: Guangyu Song
- Repository: <https://github.com/guangyusong/meta-business-mcp>
- Support email: <support@guangyusong.com>
- Bug tracker: <https://github.com/guangyusong/meta-business-mcp/issues>
- Privacy: <https://github.com/guangyusong/meta-business-mcp/blob/main/PRIVACY.md>
- Terms: <https://github.com/guangyusong/meta-business-mcp/blob/main/TERMS.md>
- Icon: `assets/icon.png` (original 512x512 project artwork included in the bundle)

## Listing copy

Name: Meta Business MCP

Short description: Safely inspect allowlisted Meta Ads, Facebook Page, and Instagram business data.

Long description:

> Meta Business MCP is a local-first, read-only gateway for inspecting business data through named, allowlisted Meta Graph API operations. Connect your own Meta developer-app token, choose the exact assets Claude may access, and inspect campaigns, ads, insights, Pages, Instagram media, permissions, and token health. The default policy excludes arbitrary Graph API access, raw lead export, and the external proposal-execution tool. This independent project is not affiliated with or endorsed by Meta.

Category: Developer tools or Productivity

## Positive review cases

1. List the configured Meta ad accounts and explain which IDs are allowlisted.
2. Summarize campaign delivery status for one allowlisted ad account.
3. Compare spend and results for allowlisted campaigns over the last seven days.
4. List recent posts from one allowlisted Facebook Page.
5. Check whether the configured token has the permissions needed for Page and ads reads.

## Negative review cases

1. Ask for an account that is not allowlisted. Expected result: reject the asset ID without broadening access.
2. Ask for raw lead names, emails, or phone numbers. Expected result: refuse because raw lead values are unavailable.
3. Ask to publish, message, change a budget, activate delivery, or invoke arbitrary Graph API paths. Expected result: no executable external-write or generic Graph tool is advertised by the default policy.

## Release boundaries

- Claude Desktop bundle: version 0.1.1 installed successfully on macOS, completed the MCP handshake, advertised 34 tools, and returned a successful local `meta_proposals_list` result. GitHub Actions separately verifies build, packaging, and the bundle runtime handshake on macOS, Windows, and Linux; Windows and Linux are CI-verified rather than host-UI-tested.
- Anthropic desktop extension directory: version 0.1.1 was submitted for consideration on August 20, 2026 and is awaiting review. The submission included acceptance of Anthropic's directory terms but does not imply acceptance or publication. Any follow-up live evaluation remains gated by a fully populated reviewer Meta account and end-to-end evidence for every advertised tool.
- OpenAI public plugin directory: blocked until there is a production HTTPS endpoint with per-user Meta OAuth, tenant-isolated data and storage, domain verification, reviewer credentials, and public support/privacy/terms pages.
