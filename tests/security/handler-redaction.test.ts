import { describe, expect, it } from "vitest";
import { handleToolCall } from "../../apps/server/src/handlers.js";
import type { RuntimeConfig } from "../../apps/server/src/config.js";
import type { FetchLike } from "../../packages/meta-client/src/index.js";

function jsonResponse(body: unknown, status = 400): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json"
    }
  });
}

describe("handler redaction", () => {
  it("does not return tokens, emails, or phone numbers from upstream errors", async () => {
    const token = "EAARabcdefghijklmnopqrstuvwxyz1234567890";
    const config: RuntimeConfig = {
      accessToken: token,
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
          id: "act_123"
        }
      ]
    };
    const fetcher: FetchLike = async () => jsonResponse({
      error: {
        code: 190,
        error_subcode: 460,
        message: `Bad token ${token}; contact jane@example.com or +1 416 555 1212`
      }
    });

    const output = await handleToolCall("meta_campaigns_list", {
      ad_account_id: "act_123"
    }, {
      config,
      fetcher
    });
    const text = JSON.stringify(output);

    expect(text).not.toContain(token);
    expect(text).not.toContain("jane@example.com");
    expect(text).not.toContain("416 555 1212");
    expect(text).toContain("[REDACTED_SECRET]");
    expect(output).toMatchObject({
      error: {
        code: "TOKEN_EXPIRED"
      }
    });
  });
});
