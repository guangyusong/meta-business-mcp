import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadRuntimeConfig, type RuntimeConfig } from "../../apps/server/src/config.js";
import { handleToolCall } from "../../apps/server/src/handlers.js";
import type { FetchLike } from "../../packages/meta-client/src/index.js";
import { FileStore } from "../../packages/storage/src/index.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json"
    }
  });
}

function testConfig(overrides: Partial<RuntimeConfig> = {}): RuntimeConfig {
  return {
    ...loadRuntimeConfig({} as NodeJS.ProcessEnv),
    accessToken: "EAARabcdefghijklmnopqrstuvwxyz1234567890",
    apiVersion: "v25.0",
    requestTimeoutMs: 1_000,
    storageDir: mkdtempSync(join(tmpdir(), "meta-business-mcp-")),
    adAccounts: [
      {
        id: "act_123",
        name: "Allowed account"
      }
    ],
    pages: [
      {
        id: "page_1",
        name: "Allowed page"
      }
    ],
    ...overrides
  };
}

describe("expanded tool handlers", () => {
  const cleanupPaths: string[] = [];

  afterEach(() => {
    for (const path of cleanupPaths.splice(0)) {
      rmSync(path, { force: true, recursive: true });
    }
  });

  it("caches sanitized Page post reads for search and fetch", async () => {
    const config = testConfig();
    cleanupPaths.push(config.storageDir);
    const store = new FileStore(config.storageDir);
    const fetcher: FetchLike = async (url) => {
      if (url.pathname.endsWith("/me/accounts")) {
        return jsonResponse({
          data: [
            {
              id: "page_1",
              access_token: "EAApageabcdefghijklmnopqrstuvwxyz1234567890"
            }
          ]
        });
      }
      if (url.pathname.endsWith("/page_1/posts")) {
        return jsonResponse({
          data: [
            {
              id: "page_1_post_1",
              message: "Launch update. Contact jane@example.com",
              created_time: "2026-06-20T00:00:00+0000"
            }
          ]
        });
      }
      return jsonResponse({ id: "page_1", name: "Allowed page" });
    };

    await expect(handleToolCall("meta_page_posts_list", {
      page_id: "page_1",
      limit: 10
    }, { config, fetcher, store })).resolves.toMatchObject({
      data: {
        posts: [
          {
            id: "page_1_post_1",
            message: "Launch update. Contact [REDACTED_EMAIL]"
          }
        ]
      }
    });

    const search = await handleToolCall("search", {
      query: "launch",
      filters: {
        source_types: ["page_post"]
      }
    }, { config, store });
    expect(search).toMatchObject({
      data: {
        results: [
          {
            id: "meta:page_post:page_1_post_1"
          }
        ]
      }
    });

    const fetched = await handleToolCall("fetch", {
      id: "meta:page_post:page_1_post_1"
    }, { config, store });
    const fetchedText = JSON.stringify(fetched);
    expect(fetchedText).not.toContain("jane@example.com");
    expect(fetchedText).not.toContain("EAApage");
  });

  it("creates, approves, and blocks execution of budget proposals when writes are disabled", async () => {
    const config = testConfig();
    cleanupPaths.push(config.storageDir);
    const store = new FileStore(config.storageDir);
    const fetcher: FetchLike = async (url) => {
      if (url.pathname.endsWith("/act_123/adsets")) {
        return jsonResponse({
          data: [
            {
              id: "adset_1",
              name: "Ad set",
              campaign_id: "campaign_1",
              daily_budget: "10000",
              effective_status: "ACTIVE"
            }
          ]
        });
      }
      return jsonResponse({});
    };

    const created = await handleToolCall("meta_proposal_create_budget_change", {
      ad_account_id: "act_123",
      target_type: "ad_set",
      target_id: "adset_1",
      budget_type: "daily",
      amount_minor: "11000",
      currency: "CAD",
      reason: "Small test increase"
    }, { config, fetcher, store }) as { data: { proposal: { proposal_id: string; proposal_hash: string } } };

    const proposalId = created.data.proposal.proposal_id;
    const proposalHash = created.data.proposal.proposal_hash;

    await handleToolCall("meta_proposal_approve", {
      proposal_id: proposalId,
      approver_id: "approver_1",
      proposal_hash: proposalHash
    }, { config, store });

    await expect(handleToolCall("meta_proposal_approve", {
      proposal_id: proposalId,
      approver_id: "approver_2",
      proposal_hash: proposalHash
    }, { config, store })).resolves.toMatchObject({
      data: {
        proposal: {
          status: "APPROVED"
        }
      }
    });

    await expect(handleToolCall("meta_proposal_execute", {
      proposal_id: proposalId,
      executor_id: "executor_1"
    }, { config, fetcher, store })).resolves.toMatchObject({
      error: {
        code: "POLICY_DENIED"
      }
    });
  });
});
