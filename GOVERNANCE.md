# Governance

This project starts with a small maintainer model.

## Review expectations

- Security-sensitive changes require two maintainer reviews once multiple maintainers exist.
- Tool additions must document permissions, input schema, output schema, safety annotations, and failure modes.
- Write-capable tools must be feature-flagged, disabled by default, and covered by threat-model updates.
- Maintainers should prefer small, auditable tools over broad convenience wrappers.

## Breaking changes

Treat these as breaking:

- removing or renaming a tool
- changing field units or meanings
- broadening a read-only tool into a write-capable tool
- changing PII exposure defaults
- weakening approval or policy semantics
