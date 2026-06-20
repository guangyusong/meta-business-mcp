import { createHash } from "node:crypto";
import type { z } from "zod";
import {
  BudgetProposalInputSchema,
  DeliveryStatusProposalInputSchema,
  type ProposalRiskClassSchema
} from "@meta-business-mcp/schemas";

export type ProposalStatus =
  | "DRAFT"
  | "VALIDATED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED"
  | "EXECUTING"
  | "SUCCEEDED"
  | "FAILED"
  | "RECONCILIATION_REQUIRED";

export type ProposalRiskClass = z.infer<typeof ProposalRiskClassSchema>;
export type BudgetProposalInput = z.infer<typeof BudgetProposalInputSchema>;
export type DeliveryStatusProposalInput = z.infer<typeof DeliveryStatusProposalInputSchema>;

export type Proposal = {
  proposal_id: string;
  status: ProposalStatus;
  action_type: "ads.budget.set" | "ads.delivery_status.set";
  target: {
    type: string;
    id: string;
  };
  before: Record<string, unknown>;
  proposed: Record<string, unknown>;
  reason: string;
  risk_class: ProposalRiskClass;
  required_approvals: number;
  policy_version: string;
  created_by: string;
  created_at: string;
  expires_at: string;
  proposal_hash: string;
};

const ALLOWED_TRANSITIONS: Record<ProposalStatus, ProposalStatus[]> = {
  DRAFT: ["VALIDATED", "CANCELLED"],
  VALIDATED: ["PENDING_APPROVAL", "CANCELLED", "EXPIRED"],
  PENDING_APPROVAL: ["APPROVED", "REJECTED", "EXPIRED", "CANCELLED"],
  APPROVED: ["EXECUTING", "EXPIRED"],
  REJECTED: [],
  EXPIRED: [],
  CANCELLED: [],
  EXECUTING: ["SUCCEEDED", "FAILED", "RECONCILIATION_REQUIRED"],
  SUCCEEDED: [],
  FAILED: [],
  RECONCILIATION_REQUIRED: ["SUCCEEDED", "FAILED"]
};

export function assertProposalTransition(from: ProposalStatus, to: ProposalStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Invalid proposal transition from ${from} to ${to}`);
  }
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);
  return `{${entries.join(",")}}`;
}

export function hashProposalPayload(payload: Omit<Proposal, "proposal_hash">): string {
  return `sha256:${createHash("sha256").update(stableStringify(payload)).digest("hex")}`;
}

export function createBudgetProposal(input: {
  proposal_id: string;
  created_by: string;
  policy_version: string;
  now: Date;
  before: Record<string, unknown>;
  request: BudgetProposalInput;
}): Proposal {
  const request = BudgetProposalInputSchema.parse(input.request);
  const base: Omit<Proposal, "proposal_hash"> = {
    proposal_id: input.proposal_id,
    status: "DRAFT",
    action_type: "ads.budget.set",
    target: {
      type: request.target_type,
      id: request.target_id
    },
    before: input.before,
    proposed: {
      budget_type: request.budget_type,
      amount_minor: request.amount_minor,
      currency: request.currency
    },
    reason: request.reason,
    risk_class: "financial",
    required_approvals: 2,
    policy_version: input.policy_version,
    created_by: input.created_by,
    created_at: input.now.toISOString(),
    expires_at: new Date(input.now.getTime() + (request.expires_in_seconds ?? 3600) * 1000).toISOString()
  };
  return {
    ...base,
    proposal_hash: hashProposalPayload(base)
  };
}

export function createDeliveryStatusProposal(input: {
  proposal_id: string;
  created_by: string;
  policy_version: string;
  now: Date;
  before: Record<string, unknown>;
  request: DeliveryStatusProposalInput;
}): Proposal {
  const request = DeliveryStatusProposalInputSchema.parse(input.request);
  const base: Omit<Proposal, "proposal_hash"> = {
    proposal_id: input.proposal_id,
    status: "DRAFT",
    action_type: "ads.delivery_status.set",
    target: {
      type: request.target_type,
      id: request.target_id
    },
    before: input.before,
    proposed: {
      status: request.proposed_status
    },
    reason: request.reason,
    risk_class: "operational",
    required_approvals: request.proposed_status === "ACTIVE" ? 2 : 1,
    policy_version: input.policy_version,
    created_by: input.created_by,
    created_at: input.now.toISOString(),
    expires_at: new Date(input.now.getTime() + (request.expires_in_seconds ?? 3600) * 1000).toISOString()
  };
  return {
    ...base,
    proposal_hash: hashProposalPayload(base)
  };
}
