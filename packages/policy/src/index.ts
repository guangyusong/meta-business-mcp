import { ToolContracts, type ToolName } from "@meta-business-mcp/schemas";

export type DefaultPolicy = {
  mode: "read_only";
  policy_version: string;
  tools: {
    allow: ToolName[];
  };
  assets: {
    require_explicit_allowlist: boolean;
    wildcard_allowed: boolean;
  };
  writes: {
    enabled: boolean;
  };
  leads: {
    enabled: boolean;
    values: "masked";
    persistent_cache: boolean;
    searchable: boolean;
  };
  queries: {
    max_date_range_days: number;
    max_page_size: number;
    max_total_rows: number;
    max_metrics: number;
    max_breakdowns: number;
  };
  content: {
    fetch_external_urls: boolean;
    pseudonymize_comment_authors: boolean;
    max_text_length: number;
  };
  logging: {
    include_request_bodies: boolean;
    include_response_bodies: boolean;
    hash_asset_ids: boolean;
  };
};

export const defaultPolicy: DefaultPolicy = {
  mode: "read_only",
  policy_version: "2026-06-20-read-only-v1",
  tools: {
    allow: Object.entries(ToolContracts)
      .filter(([toolName, contract]) =>
        contract.annotations.readOnlyHint ||
        (toolName.startsWith("meta_proposal_") && toolName !== "meta_proposal_execute")
      )
      .map(([toolName]) => toolName as ToolName)
  },
  assets: {
    require_explicit_allowlist: true,
    wildcard_allowed: false
  },
  writes: {
    enabled: false
  },
  leads: {
    enabled: false,
    values: "masked",
    persistent_cache: false,
    searchable: false
  },
  queries: {
    max_date_range_days: 90,
    max_page_size: 100,
    max_total_rows: 5000,
    max_metrics: 20,
    max_breakdowns: 2
  },
  content: {
    fetch_external_urls: false,
    pseudonymize_comment_authors: true,
    max_text_length: 10000
  },
  logging: {
    include_request_bodies: false,
    include_response_bodies: false,
    hash_asset_ids: true
  }
};

export function isToolAllowed(toolName: ToolName, policy: DefaultPolicy = defaultPolicy): boolean {
  return policy.tools.allow.includes(toolName);
}

export function assertToolAllowed(toolName: ToolName, policy: DefaultPolicy = defaultPolicy): void {
  if (!isToolAllowed(toolName, policy)) {
    throw new Error(`Tool ${toolName} is denied by default policy`);
  }
}

export function assertWritesDisabled(policy: DefaultPolicy = defaultPolicy): void {
  if (policy.writes.enabled) {
    throw new Error("Meta writes are not allowed in the public v1 policy");
  }
}
