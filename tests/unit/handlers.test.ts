import { describe, expect, it } from "vitest";
import { handleToolCall } from "../../apps/server/src/handlers.js";
import type { RuntimeConfig } from "../../apps/server/src/config.js";
import type { FetchLike } from "../../packages/meta-client/src/index.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json"
    }
  });
}

const baseConfig: RuntimeConfig = {
  accessToken: "EAARabcdefghijklmnopqrstuvwxyz1234567890",
  apiVersion: "v25.0",
  requestTimeoutMs: 1_000,
  storageDir: "/tmp/meta-business-mcp-test",
  writesEnabled: false,
  maxBudgetChangePercent: 25,
  pages: [],
  instagramAccounts: [],
  pixels: [],
  businesses: [],
  httpAuth: {
    enabled: false,
    requiredScopes: []
  },
  adAccounts: [
    {
      id: "act_123",
      name: "Allowed account"
    }
  ]
};

describe("tool handlers", () => {
  it("reports not_configured connection status without calling Meta", async () => {
    const output = await handleToolCall("meta_connection_status", {}, {
      config: {
        apiVersion: "v25.0",
        requestTimeoutMs: 1_000,
        storageDir: "/tmp/meta-business-mcp-test",
        writesEnabled: false,
        maxBudgetChangePercent: 25,
        adAccounts: [],
        pages: [],
        instagramAccounts: [],
        pixels: [],
        businesses: [],
        httpAuth: {
          enabled: false,
          requiredScopes: []
        }
      }
    });

    expect(output).toMatchObject({
      data: {
        configured: false,
        state: "not_configured",
        capabilities: {
          ads_read: false,
          writes: false,
          raw_leads: false
        }
      }
    });
  });

  it("enforces the configured ad account allowlist before calling Meta", async () => {
    let calls = 0;
    const fetcher: FetchLike = async () => {
      calls += 1;
      return jsonResponse({});
    };

    const output = await handleToolCall("meta_campaigns_list", {
      ad_account_id: "act_999"
    }, {
      config: baseConfig,
      fetcher
    });

    expect(calls).toBe(0);
    expect(output).toMatchObject({
      error: {
        code: "ASSET_NOT_ALLOWED"
      }
    });
  });

  it("returns read-only live data from mocked Meta responses", async () => {
    const fetcher: FetchLike = async (url) => {
      if (url.pathname.endsWith("/me")) {
        return jsonResponse({ id: "principal_123" });
      }
      if (url.pathname.endsWith("/debug_token")) {
        return jsonResponse({
          data: {
            is_valid: true,
            type: "USER",
            scopes: ["ads_read"],
            data_access_expires_at: 1_820_000_000
          }
        });
      }
      if (url.pathname.endsWith("/act_123/campaigns")) {
        return jsonResponse({
          data: [
            {
              id: "campaign_123",
              name: "Campaign",
              effective_status: "ACTIVE"
            }
          ]
        });
      }
      if (url.pathname.endsWith("/act_123/insights")) {
        return jsonResponse({
          data: [
            {
              account_id: "123",
              campaign_id: "campaign_123",
              spend: "1.23",
              impressions: "100",
              clicks: "4",
              date_start: "2026-06-01",
              date_stop: "2026-06-07"
            }
          ]
        });
      }
      return jsonResponse({
        id: "act_123",
        name: "Account 123",
        currency: "CAD"
      });
    };

    await expect(handleToolCall("meta_connection_status", {}, {
      config: baseConfig,
      fetcher
    })).resolves.toMatchObject({
      data: {
        state: "valid",
        capabilities: {
          ads_read: true,
          writes: false,
          raw_leads: false
        }
      }
    });

    await expect(handleToolCall("meta_campaigns_list", {
      ad_account_id: "act_123",
      limit: 10
    }, {
      config: baseConfig,
      fetcher
    })).resolves.toMatchObject({
      data: {
        campaigns: [
          {
            id: "campaign_123"
          }
        ]
      }
    });

    await expect(handleToolCall("meta_ads_insights_query", {
      ad_account_id: "act_123",
      level: "campaign",
      time_range: {
        since: "2026-06-01",
        until: "2026-06-07"
      },
      metrics: ["spend", "impressions", "clicks"],
      limit: 10
    }, {
      config: baseConfig,
      fetcher
    })).resolves.toMatchObject({
      data: {
        rows: [
          {
            campaign_id: "campaign_123",
            spend: "1.23"
          }
        ]
      }
    });
  });

  it("rejects insight ranges longer than policy allows", async () => {
    const output = await handleToolCall("meta_ads_insights_query", {
      ad_account_id: "act_123",
      level: "campaign",
      time_range: {
        since: "2026-01-01",
        until: "2026-06-01"
      },
      metrics: ["spend"]
    }, {
      config: baseConfig
    });

    expect(output).toMatchObject({
      error: {
        code: "INVALID_QUERY"
      }
    });
  });
});
