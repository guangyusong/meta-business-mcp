# Meta App Review Notes

Each self-hoster must create and manage its own Meta developer app. This repository cannot grant Meta permissions.

Expected deployment responsibilities:

- Create a Meta app.
- Configure OAuth redirect URLs.
- Request only the permissions needed for the enabled capability profile.
- Complete business verification and app review where required.
- Maintain a privacy policy and data deletion flow.
- Use test assets and screencasts for review.

## Suggested rollout

1. Ads reporting: request read-only ads access first.
2. Pages and Instagram reads: add Page and Instagram read/insight permissions later.
3. Leads: keep separate, masked, and disabled by default.
4. Writes: request only after approval and audit controls are production-ready.

The exact Meta dashboard and permission process changes over time. Keep this document dated when real app-review work begins.
