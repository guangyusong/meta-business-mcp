import { describe, expect, it } from "vitest";
import {
  assertNoForbiddenToolNames,
  CampaignsListInputSchema,
  SafeErrorSchema,
  ToolContracts
} from "../../packages/schemas/src/index.js";

describe("tool schemas", () => {
  it("rejects unknown input properties", () => {
    expect(() =>
      CampaignsListInputSchema.parse({
        ad_account_id: "act_123",
        arbitrary_graph_path: "/me"
      })
    ).toThrow();
  });

  it("does not register forbidden tool names", () => {
    expect(() => assertNoForbiddenToolNames(Object.keys(ToolContracts))).not.toThrow();
  });

  it("catches unsafe tool names", () => {
    expect(() => assertNoForbiddenToolNames(["search", "meta_graph_request"])).toThrow(/Forbidden/);
  });

  it("validates the safe error envelope", () => {
    expect(() =>
      SafeErrorSchema.parse({
        error: {
          code: "DATA_UNAVAILABLE",
          safe_message: "No live data in skeleton.",
          retryable: false
        }
      })
    ).not.toThrow();
  });
});
