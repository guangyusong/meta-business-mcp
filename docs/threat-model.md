# Threat Model

The highest-risk mistake is treating a conversational model as a trusted operator. This project treats Meta content as untrusted external data and Meta actions as consequential operations requiring independent controls.

## Current skeleton risks

- Tool schemas drift into overly broad Graph access.
- Secrets or PII appear in logs, fixtures, docs, or tool outputs.
- A future contributor adds write-like behavior without policy review.
- Clara-private workflows leak into the public repository.

## Required controls

- No generic Graph request tool.
- No live credentials in tests.
- No raw upstream error bodies in user-facing results.
- No tokens in logs, tool arguments, or tool outputs.
- No raw lead PII in v1.
- No Meta `POST`, `DELETE`, publishing, messaging, budget, activation, or moderation execution in v1.
- Every remote string from Meta must be treated as untrusted data, not instructions.

## Prompt injection

Campaign names, comments, captions, post text, creative copy, and lead fields can contain malicious instructions. Tool outputs must return structured data and should label remote text as untrusted when live reads are added.

## Write-path gate

Before any Meta write exists, the project needs:

- Independent approval UI or workflow.
- Approver reauthentication.
- Proposal hashes.
- One-time execution.
- Optimistic current-state checks.
- Reconciliation for ambiguous upstream failures.
- Financial caps for spend-affecting operations.
- Security tests proving replay, mutation, and cross-tenant failures are rejected.
