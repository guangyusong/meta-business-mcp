import { describe, expect, it } from "vitest";
import {
  assertToolAllowed,
  assertWritesDisabled,
  defaultPolicy,
  isToolAllowed
} from "../../packages/policy/src/index.js";

describe("default policy", () => {
  it("is read-only and disables Meta writes", () => {
    expect(defaultPolicy.mode).toBe("read_only");
    expect(defaultPolicy.writes.enabled).toBe(false);
    expect(() => assertWritesDisabled(defaultPolicy)).not.toThrow();
  });

  it("allows read tools", () => {
    expect(isToolAllowed("meta_campaigns_list")).toBe(true);
    expect(() => assertToolAllowed("meta_ads_insights_query")).not.toThrow();
  });

  it("does not allow local proposal tools in the default read-only profile", () => {
    expect(isToolAllowed("meta_proposal_create_budget_change")).toBe(false);
    expect(() => assertToolAllowed("meta_proposal_create_budget_change")).toThrow(/denied/);
  });

  it("blocks policy variants that enable writes", () => {
    expect(() =>
      assertWritesDisabled({
        ...defaultPolicy,
        writes: { enabled: true }
      })
    ).toThrow(/writes/);
  });
});
