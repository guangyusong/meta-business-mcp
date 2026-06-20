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
  +--> Proposal services -> local proposal records
  |
  +--> Audit and redaction
```

## Design rules

- The server must never expose a generic Graph API request tool.
- Every future Meta call must be represented by a named operation.
- Every named operation must define a fixed HTTP method, path template, field allowlist, bounded input schema, output schema, permission profile, and safety classification.
- The public skeleton must remain read-only against Meta.
- Proposal tools create local review artifacts only. They do not approve or execute changes.
- Approval and execution must be separate systems in a later milestone.

## Package boundaries

- `packages/schemas`: shared tool contracts and safe envelopes.
- `packages/meta-client`: allowlisted Meta API boundary. It must not depend on MCP.
- `packages/policy`: default-safe policy and deny-by-default checks.
- `packages/proposals`: proposal state and hashing primitives.
- `packages/audit`: audit event model and redaction helpers.
- `apps/server`: MCP transport and tool registration.

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
