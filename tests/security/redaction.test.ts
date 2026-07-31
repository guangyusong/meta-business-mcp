import { describe, expect, it } from "vitest";
import { redactSecrets, redactText } from "../../packages/audit/src/index.js";

describe("redaction", () => {
  it("redacts token-like values from strings", () => {
    const text = "Authorization: Bearer EAARabcdefghijklmnopqrstuvwxyz1234567890";
    expect(redactText(text)).not.toContain("EAARabcdefghijklmnopqrstuvwxyz");
    expect(redactText(text)).toContain("[REDACTED_SECRET]");
  });

  it("redacts email and phone canaries", () => {
    const text = "Lead is jane@example.com and +1 416 555 1212";
    const redacted = redactText(text);
    expect(redacted).not.toContain("jane@example.com");
    expect(redacted).not.toContain("416 555 1212");
  });

  it("does not redact UUIDs, timestamps, or Meta account IDs as phone numbers", () => {
    const text = "request 392d1bde-99f2-4339-9ab7-59256034c512 at 2026-06-20T09:26:01.786Z for act_1234567890123456";
    expect(redactText(text)).toBe(text);
  });

  it("redacts object keys that contain secrets", () => {
    const redacted = redactSecrets({
      access_token: "EAABabcdefghijklmnopqrstuvwxyz1234567890",
      nested: {
        client_secret: "secret-value"
      },
      authorization_servers: ["https://issuer.example"],
      meta_token_health_check: {
        data: {
          auth: {
            valid: true
          }
        }
      },
      safe: "campaign_123"
    });
    expect(JSON.stringify(redacted)).not.toContain("EAAB");
    expect(JSON.stringify(redacted)).not.toContain("secret-value");
    expect(redacted.authorization_servers).toEqual(["https://issuer.example"]);
    expect(redacted.meta_token_health_check).toMatchObject({
      data: {
        auth: {
          valid: true
        }
      }
    });
    expect(redacted.safe).toBe("campaign_123");
  });
});
