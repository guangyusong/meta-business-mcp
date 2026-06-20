import { describe, expect, it } from "vitest";
import {
  assertProposalTransition,
  createBudgetProposal,
  createDeliveryStatusProposal,
  hashProposalPayload
} from "../../packages/proposals/src/index.js";

const now = new Date("2026-06-20T00:00:00.000Z");

describe("proposals", () => {
  it("creates stable budget proposal hashes", () => {
    const proposal = createBudgetProposal({
      proposal_id: "prop_1",
      created_by: "user_1",
      policy_version: "test-policy",
      now,
      before: { amount_minor: "10000", currency: "CAD" },
      request: {
        target_type: "ad_set",
        target_id: "adset_1",
        budget_type: "daily",
        amount_minor: "12000",
        currency: "CAD",
        reason: "Test proposal"
      }
    });

    const { proposal_hash, ...payload } = proposal;
    expect(proposal_hash).toBe(hashProposalPayload(payload));
    expect(proposal.risk_class).toBe("financial");
    expect(proposal.required_approvals).toBe(2);
  });

  it("requires two approvals for activation proposals", () => {
    const proposal = createDeliveryStatusProposal({
      proposal_id: "prop_2",
      created_by: "user_1",
      policy_version: "test-policy",
      now,
      before: { status: "PAUSED" },
      request: {
        target_type: "campaign",
        target_id: "campaign_1",
        proposed_status: "ACTIVE",
        reason: "Test activation"
      }
    });

    expect(proposal.required_approvals).toBe(2);
  });

  it("enforces proposal state transitions", () => {
    expect(() => assertProposalTransition("DRAFT", "VALIDATED")).not.toThrow();
    expect(() => assertProposalTransition("DRAFT", "SUCCEEDED")).toThrow(/Invalid/);
  });
});
