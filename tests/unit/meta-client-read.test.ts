import { describe, expect, it } from "vitest";
import {
  MetaClientError,
  MetaReadClient,
  normalizeConfiguredAdAccounts,
  type FetchLike
} from "../../packages/meta-client/src/index.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json"
    }
  });
}

describe("Meta read client", () => {
  it("normalizes supported ad account allowlist shapes and ignores inactive entries", () => {
    const accounts = normalizeConfiguredAdAccounts({
      accounts: [
        {
          alias: "Primary",
          account_id: "123",
          account_name: "Primary Account",
          status: "active"
        },
        {
          account_id: "act_456",
          status: "archived"
        }
      ]
    });

    expect(accounts).toEqual([
      {
        id: "act_123",
        name: "Primary Account",
        status: "active",
        alias: "Primary"
      }
    ]);
  });

  it("lists only configured ad accounts and paginates over the local allowlist", async () => {
    const paths: string[] = [];
    const fetcher: FetchLike = async (url) => {
      paths.push(url.pathname);
      return jsonResponse({
        id: url.pathname.endsWith("act_123") ? "act_123" : "act_456",
        name: url.pathname.endsWith("act_123") ? "Account 123" : "Account 456",
        currency: "CAD"
      });
    };
    const client = new MetaReadClient({
      accessToken: "EAARabcdefghijklmnopqrstuvwxyz1234567890",
      fetcher
    });
    const allowlist = normalizeConfiguredAdAccounts([
      { id: "act_123", name: "Configured 123" },
      { id: "act_456", name: "Configured 456" }
    ]);

    const first = await client.listAllowedAdAccounts(allowlist, { limit: 1 });
    expect(first.data).toHaveLength(1);
    expect(first.data[0]?.id).toBe("act_123");
    expect(first.nextCursor).toMatch(/^allowlist:/);

    const second = await client.listAllowedAdAccounts(allowlist, {
      limit: 1,
      after: first.nextCursor
    });
    expect(second.data[0]?.id).toBe("act_456");
    expect(second.nextCursor).toBeUndefined();
    expect(paths).toEqual(["/v25.0/act_123", "/v25.0/act_456"]);
  });

  it("builds allowlisted campaign and insights requests", async () => {
    const urls: URL[] = [];
    const fetcher: FetchLike = async (url) => {
      urls.push(url);
      if (url.pathname.endsWith("/campaigns")) {
        return jsonResponse({
          data: [
            {
              id: "120",
              name: "Lead campaign",
              objective: "OUTCOME_LEADS",
              effective_status: "ACTIVE"
            },
            {
              id: "121",
              name: "Awareness campaign",
              objective: "OUTCOME_AWARENESS",
              effective_status: "ACTIVE"
            }
          ],
          paging: {
            cursors: {
              after: "NEXT"
            }
          }
        });
      }
      return jsonResponse({
        data: [
          {
            account_id: "123",
            campaign_id: "120",
            spend: "12.34",
            impressions: "1000",
            clicks: "12",
            date_start: "2026-06-01",
            date_stop: "2026-06-07"
          }
        ]
      });
    };
    const client = new MetaReadClient({
      accessToken: "EAARabcdefghijklmnopqrstuvwxyz1234567890",
      apiVersion: "v25.0",
      fetcher
    });

    const campaigns = await client.listCampaigns({
      ad_account_id: "act_123",
      effective_status: ["ACTIVE"],
      objective: ["OUTCOME_LEADS"],
      limit: 50
    });
    expect(campaigns.data).toHaveLength(1);
    expect(campaigns.nextCursor).toBe("NEXT");
    expect(urls[0]?.searchParams.get("fields")).toContain("effective_status");
    expect(urls[0]?.searchParams.get("effective_status")).toBe("[\"ACTIVE\"]");

    const insights = await client.queryInsights({
      ad_account_id: "act_123",
      level: "ad_set",
      time_range: {
        since: "2026-06-01",
        until: "2026-06-07"
      },
      metrics: ["spend", "impressions", "clicks", "actions"],
      breakdowns: ["publisher_platform"],
      limit: 25
    });
    expect(insights.data[0]?.campaign_id).toBe("120");
    expect(urls[1]?.searchParams.get("level")).toBe("adset");
    expect(urls[1]?.searchParams.get("breakdowns")).toBe("publisher_platform");
    expect(urls[1]?.searchParams.get("fields")).not.toContain("email");
  });

  it("maps Meta token failures to safe client errors", async () => {
    const fetcher: FetchLike = async () => jsonResponse({
      error: {
        code: 190,
        error_subcode: 460,
        message: "Error validating access token: session invalidated"
      }
    }, 400);
    const client = new MetaReadClient({
      accessToken: "EAARabcdefghijklmnopqrstuvwxyz1234567890",
      fetcher
    });

    await expect(client.getPrincipal()).rejects.toMatchObject({
      safeCode: "TOKEN_EXPIRED",
      retryable: false,
      providerCode: 190,
      providerSubcode: 460
    } satisfies Partial<MetaClientError>);
  });
});
