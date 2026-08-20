# Security Policy

## Supported versions

This project is currently pre-release. Security fixes apply to `main` until the first tagged release policy is defined.

## Reporting a vulnerability

Do not open a public issue for suspected token leakage, authorization bypass, cross-tenant access, or unsafe write-path behavior.

Send a private report to the repository owner through GitHub. Do not include vulnerability details, credentials, account data, or personal data in a public issue. Private vulnerability reporting will be enabled before the first tagged release.

## Security invariants

- No live Meta credentials in tests or fixtures.
- No raw Meta tokens in tool arguments, tool outputs, logs, audit events, or docs.
- No arbitrary Graph API proxy.
- The default public policy does not advertise the Meta proposal-execution tool.
- Write execution tools accept only `proposal_id`, never free-form mutation arguments.
- No raw lead values.
- No company-specific operational data in this repository.
