# Security Policy

## Supported versions

This project is currently a pre-release skeleton. Security fixes apply to `main` until the first tagged release policy is defined.

## Reporting a vulnerability

Do not open a public issue for suspected token leakage, authorization bypass, cross-tenant access, or unsafe write-path behavior.

Send a private report to the maintainers once a project security contact is published. Until then, keep reports private to the repository owner.

## Security invariants

- No live Meta credentials in tests or fixtures.
- No raw Meta tokens in tool arguments, tool outputs, logs, audit events, or docs.
- No arbitrary Graph API proxy.
- No Meta writes in the public skeleton.
- No raw lead values in the public skeleton.
- No Clara-specific operational data in this repository.
