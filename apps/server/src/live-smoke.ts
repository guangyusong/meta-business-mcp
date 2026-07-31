#!/usr/bin/env node
import { redactSecrets } from "@meta-business-mcp/audit";
import { loadRuntimeConfig } from "./config.js";
import { handleToolCall } from "./handlers.js";

function isoDate(daysAgo: number): string {
  const date = new Date(Date.now() - daysAgo * 86_400_000);
  return date.toISOString().slice(0, 10);
}

async function main(): Promise<void> {
  if (process.env.META_BUSINESS_MCP_LIVE_TEST !== "1") {
    console.log("Skipping live Meta smoke test. Set META_BUSINESS_MCP_LIVE_TEST=1 to enable it.");
    return;
  }

  const config = loadRuntimeConfig();
  const firstAccount = config.adAccounts[0];
  const firstPage = config.pages[0];
  const firstInstagramAccount = config.instagramAccounts[0];
  const outputs: Record<string, unknown> = {};

  outputs.meta_connection_status = await handleToolCall("meta_connection_status", {}, { config });
  outputs.meta_ad_accounts_list = await handleToolCall("meta_ad_accounts_list", { limit: 10 }, { config });
  outputs.meta_allowed_assets_list = await handleToolCall("meta_allowed_assets_list", {}, { config });
  outputs.meta_token_health_check = await handleToolCall("meta_token_health_check", {}, { config });

  if (firstAccount) {
    outputs.meta_campaigns_list = await handleToolCall("meta_campaigns_list", {
      ad_account_id: firstAccount.id,
      limit: 10
    }, { config });

    outputs.meta_ads_insights_query = await handleToolCall("meta_ads_insights_query", {
      ad_account_id: firstAccount.id,
      level: "campaign",
      time_range: {
        since: isoDate(7),
        until: isoDate(1)
      },
      metrics: ["spend", "impressions", "clicks", "actions"],
      time_increment: "all_days",
      limit: 10
    }, { config });

    outputs.meta_adsets_list = await handleToolCall("meta_adsets_list", {
      ad_account_id: firstAccount.id,
      limit: 10
    }, { config });

    outputs.meta_ads_list = await handleToolCall("meta_ads_list", {
      ad_account_id: firstAccount.id,
      limit: 10
    }, { config });

    outputs.meta_ad_creatives_list = await handleToolCall("meta_ad_creatives_list", {
      ad_account_id: firstAccount.id,
      limit: 10
    }, { config });
  }

  if (firstPage) {
    outputs.meta_pages_list = await handleToolCall("meta_pages_list", { limit: 10 }, { config });
    outputs.meta_page_get = await handleToolCall("meta_page_get", {
      page_id: firstPage.id
    }, { config });
    outputs.meta_page_posts_list = await handleToolCall("meta_page_posts_list", {
      page_id: firstPage.id,
      limit: 5
    }, { config });
    outputs.meta_instagram_accounts_list = await handleToolCall("meta_instagram_accounts_list", {
      page_id: firstPage.id
    }, { config });
    outputs.meta_lead_forms_list = await handleToolCall("meta_lead_forms_list", {
      page_id: firstPage.id,
      limit: 5
    }, { config });
  }

  if (firstInstagramAccount) {
    outputs.meta_instagram_media_list = await handleToolCall("meta_instagram_media_list", {
      instagram_account_id: firstInstagramAccount.id,
      limit: 5
    }, { config });
  }

  outputs.search = await handleToolCall("search", {
    query: "campaign",
    limit: 5
  }, { config });

  console.log(JSON.stringify(redactSecrets(outputs), null, 2));
}

main().catch((error: unknown) => {
  console.error(redactSecrets(error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});
