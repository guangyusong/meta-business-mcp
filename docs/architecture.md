# Architecture

Meta Business MCP is designed as an auditable gateway, not as an autonomous operator.

```text
MCP client
  |
  v
MCP server
  |
  v
Tool registry
  |
  v
Policy and validation
  |
  +--> Read services -> allowlisted Meta API client
  |
  +--> Snapshot services -> sanitized local search/fetch
  |
  +--> Proposal services -> local proposal records -> guarded named writes
  |
  +--> Audit and redaction
```

## Design rules

- The server must never expose a generic Graph API request tool.
- Every future Meta call must be represented by a named operation.
- Every named operation must define a fixed HTTP method, path template, field allowlist, bounded input schema, output schema, permission profile, and safety classification.
- Public/default behavior must keep Meta writes disabled.
- Proposal tools create local review artifacts with stable hashes and before-state.
- Execution tools must accept only `proposal_id`, reject stale/expired/replayed proposals, and run only named write operations when a private runtime explicitly enables writes.

## Package boundaries

- `packages/schemas`: shared tool contracts and safe envelopes.
- `packages/meta-client`: allowlisted read-only Meta API boundary and client. It must not depend on MCP.
- `packages/policy`: default-safe policy and deny-by-default checks.
- `packages/proposals`: proposal state and hashing primitives.
- `packages/storage`: local JSON-file storage for sanitized snapshots and proposals.
- `packages/audit`: audit event model and redaction helpers.
- `apps/server`: stdio and Streamable HTTP MCP transport, tool registration, handlers, and auth-gated HTTP path.

## Public versus private

Public repository:

- Generic connector mechanics.
- Tool schemas.
- Policy, proposal, audit, redaction, and safety controls.
- Mock fixtures and docs.

Private layers:

- Company-specific workflows.
- KPI thresholds.
- Account and customer mappings.
- CRM, Slack, or internal warehouse integrations.
- Proprietary recommendation logic.
