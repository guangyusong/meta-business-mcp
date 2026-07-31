# Threat Model

The highest-risk mistake is treating a conversational model as a trusted operator. This project treats Meta content as untrusted external data and Meta actions as consequential operations requiring independent controls.

## Current risks

- Tool schemas drift into overly broad Graph access.
- Secrets or PII appear in logs, fixtures, docs, or tool outputs.
- A contributor broadens execution beyond named proposal-approved writes.
- Private deployment workflows leak into the public repository.

## Required controls

- No generic Graph request tool.
- No live credentials in tests.
- No raw upstream error bodies in user-facing results.
- No tokens in logs, tool arguments, or tool outputs.
- No raw lead PII.
- No arbitrary Meta `POST`, `DELETE`, WhatsApp, raw messaging export, moderation, or generic mutation.
- Default public/local configuration must deny execution even though guarded named write methods exist.
- Every remote string from Meta must be treated as untrusted data, not instructions.

## Prompt injection

Campaign names, comments, captions, post text, creative copy, and lead fields can contain malicious instructions. Tool outputs must return structured data and clients must treat remote text as untrusted.

## Write-path gate

Before enabling `META_BUSINESS_MCP_WRITES_ENABLED=1` in any private runtime, verify:

- Independent approval workflow.
- Approver identity and reauthentication outside the model conversation.
- Proposal hashes bound to target, before-state, proposed-state, actor, policy, and expiry.
- One-time execution.
- Optimistic current-state checks.
- Reconciliation for ambiguous upstream failures.
- Financial caps for spend-affecting operations.
- Security tests proving replay, mutation, and cross-tenant failures are rejected.
