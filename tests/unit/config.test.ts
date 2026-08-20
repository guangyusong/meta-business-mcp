import { describe, expect, it } from "vitest";
import { loadRuntimeConfig } from "../../apps/server/src/config.js";

describe("runtime config", () => {
  it("loads env token, API version, timeout, and inline ad account allowlist", () => {
    const config = loadRuntimeConfig({
      META_ADS_TOKEN: "EAARabcdefghijklmnopqrstuvwxyz1234567890",
      META_ADS_API_VERSION: "v21.0",
      META_BUSINESS_MCP_TIMEOUT_MS: "5000",
      META_BUSINESS_MCP_AD_ACCOUNTS_JSON: JSON.stringify({
        accounts: [
          {
            account_id: "123",
            account_name: "Configured account",
            status: "active"
          }
        ]
      })
    } as NodeJS.ProcessEnv);

    expect(config).toMatchObject({
      accessToken: "EAARabcdefghijklmnopqrstuvwxyz1234567890",
      apiVersion: "v21.0",
      requestTimeoutMs: 5000,
      adAccounts: [
        {
          id: "act_123",
          name: "Configured account"
        }
      ]
    });
  });

  it("supports comma-separated account IDs when no JSON/file allowlist is configured", () => {
    const config = loadRuntimeConfig({
      META_AD_ACCOUNT_IDS: "123, act_456"
    } as NodeJS.ProcessEnv);

    expect(config.adAccounts.map((account) => account.id)).toEqual(["act_123", "act_456"]);
  });

  it("treats unresolved MCPB user-config placeholders as missing optional values", () => {
    const config = loadRuntimeConfig({
      META_ADS_TOKEN: "${user_config.meta_access_token}",
      META_AD_ACCOUNT_IDS: "${user_config.ad_account_ids}",
      META_PAGE_IDS: "${user_config.page_ids}",
      META_INSTAGRAM_ACCOUNT_IDS: "${user_config.instagram_account_ids}",
      META_PIXEL_IDS: "${user_config.pixel_ids}",
      META_BUSINESS_IDS: "${user_config.business_ids}"
    } as NodeJS.ProcessEnv);

    expect(config).not.toHaveProperty("accessToken");
    expect(config.adAccounts).toEqual([]);
    expect(config.pages).toEqual([]);
    expect(config.instagramAccounts).toEqual([]);
    expect(config.pixels).toEqual([]);
    expect(config.businesses).toEqual([]);
  });
});
