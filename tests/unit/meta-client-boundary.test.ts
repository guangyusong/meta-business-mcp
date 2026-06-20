import { describe, expect, it } from "vitest";
import { ALLOWED_META_REQUESTS, MetaClientBoundary } from "../../packages/meta-client/src/index.js";

describe("Meta client boundary", () => {
  it("contains only read operations in the skeleton", () => {
    const client = new MetaClientBoundary();
    expect(() => client.assertReadOnly()).not.toThrow();
    expect(client.describeAll().every((request) => request.method === "GET")).toBe(true);
  });

  it("does not expose a generic Graph request", () => {
    expect(() => new MetaClientBoundary().graphRequest()).toThrow(/Arbitrary Graph API/);
  });

  it("uses allowlisted fields for each operation", () => {
    for (const request of Object.values(ALLOWED_META_REQUESTS)) {
      expect(request.allowedFields.length).toBeGreaterThan(0);
      expect(request.allowedFields).not.toContain("*");
    }
  });
});
