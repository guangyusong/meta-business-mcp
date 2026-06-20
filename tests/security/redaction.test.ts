import { describe, expect, it } from "vitest";
import { redactSecrets, redactText } from "../../packages/audit/src/index.js";

describe("redaction", () => {
  it("redacts token-like values from strings", () => {
    const text = "Authorization: Bearer EAABabcdefghijklmnopqrstuvwxyz1234567890";
    expect(redactText(text)).not.toContain("EAABabcdefghijklmnopqrstuvwxyz");
    expect(redactText(text)).toContain("[REDACTED_SECRET]");
  });

  it("redacts email and phone canaries", () => {
    const text = "Lead is jane@example.com and +1 416 555 1212";
    const redacted = redactText(text);
    expect(redacted).not.toContain("jane@example.com");
    expect(redacted).not.toContain("416 555 1212");
  });

  it("redacts object keys that contain secrets", () => {
    const redacted = redactSecrets({
      access_token: "EAABabcdefghijklmnopqrstuvwxyz1234567890",
      nested: {
        client_secret: "secret-value"
      },
      safe: "campaign_123"
    });
    expect(JSON.stringify(redacted)).not.toContain("EAAB");
    expect(JSON.stringify(redacted)).not.toContain("secret-value");
    expect(redacted.safe).toBe("campaign_123");
  });
});
