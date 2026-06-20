# Permission Matrix

This file describes intended permission profiles. It is not a guarantee that Meta will grant or honor these permissions for every deployment.

| Profile | Intended capability | Baseline Meta permission family |
| --- | --- | --- |
| `ADS_READ` | Ads account, campaign, ad set, ad, creative, and insights reads | `ads_read` |
| `PAGE_DISCOVERY` | Page discovery | `pages_show_list` |
| `PAGE_READ` | Page metadata and Page-authored content | `pages_show_list`, `pages_read_engagement` |
| `IG_FB_BASIC` | Page-linked Instagram account discovery | `pages_show_list`, `instagram_basic` |
| `IG_FB_INSIGHTS` | Instagram insights | `instagram_manage_insights` plus account access |
| `LEADS_READ_MASKED` | Masked lead metadata only | disabled by default |
| `ADS_WRITE` | Budget/status execution | not part of v1 |

## Rules

- Scope names alone are not enough. Capability probing must verify endpoint access for the actual asset.
- Leads must use a separate credential profile and remain disabled by default.
- Write scopes must not be requested until approval and execution controls exist.
