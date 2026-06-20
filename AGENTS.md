# Meta Business MCP Instructions

- Keep this repository open-source-safe.
- Do not add Clara-specific prompts, account IDs, client names, workflows, CRM mappings, budgets, thresholds, or private playbooks.
- Do not add live Meta credentials, tokens, app secrets, user data, lead data, or production payloads.
- Do not add generic Graph API proxy tools. Every Meta API operation must be allowlisted by name.
- Default to read-only behavior. Write, messaging, publishing, delete, budget-change, and campaign-activation behavior must remain absent unless explicitly requested in a later security-reviewed milestone.
- Tests must not require live Meta credentials.
