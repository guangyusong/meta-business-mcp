# Contributing

This project is intentionally conservative because it can eventually touch ad spend, public pages, comments, messages, and lead data.

Before opening a pull request:

- Run `npm run typecheck`.
- Run `npm test`.
- Run `npm run build`.
- Include tests for schema, policy, and redaction changes.
- Do not include live Meta responses unless they are fully synthetic or sanitized.
- Do not add write tools without a threat-model update.
- Do not add generic Graph API access.

Security-sensitive areas require extra review:

- credential handling
- policy enforcement
- proposal and approval semantics
- audit logging
- Meta execution code
- redaction and PII handling
