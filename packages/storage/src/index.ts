import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { redactSecrets } from "@meta-business-mcp/audit";

export type StoredDocument = {
  id: string;
  title: string;
  source_type: string;
  asset_id?: string;
  text: string;
  structured?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  data_classification: "business_confidential" | "personal" | "restricted";
  redaction_status: "redacted" | "masked" | "metadata_only";
  provenance: {
    system: string;
    source_id?: string;
  };
};

export type ProposalRecord = {
  proposal_id: string;
  status: string;
  action_type: string;
  target: {
    type: string;
    id: string;
  };
  before: Record<string, unknown>;
  proposed: Record<string, unknown>;
  reason: string;
  risk_class: string;
  required_approvals: number;
  approvals: Array<{
    approver_id: string;
    approved_at: string;
    proposal_hash: string;
  }>;
  policy_version: string;
  created_by: string;
  created_at: string;
  expires_at: string;
  proposal_hash: string;
  execution?: {
    executed_by: string;
    executed_at: string;
    status: "SUCCEEDED" | "FAILED" | "RECONCILIATION_REQUIRED";
    receipt: Record<string, unknown>;
  };
};

export type SearchFilters = {
  source_types?: string[];
  asset_ids?: string[];
  since?: string;
  until?: string;
};

export class FileStore {
  constructor(private readonly rootDir: string) {}

  upsertDocument(document: StoredDocument): StoredDocument {
    const documents = this.readArray<StoredDocument>("documents.json");
    const sanitized = redactSecrets(document);
    const index = documents.findIndex((item) => item.id === sanitized.id);
    if (index === -1) {
      documents.push(sanitized);
    } else {
      documents[index] = sanitized;
    }
    this.writeArray("documents.json", documents);
    return sanitized;
  }

  fetchDocument(id: string): StoredDocument | undefined {
    const now = Date.now();
    return this.readArray<StoredDocument>("documents.json").find((document) =>
      document.id === id && !isExpired(document.expires_at, now)
    );
  }

  searchDocuments(query: string, filters: SearchFilters = {}, limit = 20): StoredDocument[] {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    const now = Date.now();
    return this.readArray<StoredDocument>("documents.json")
      .filter((document) => !isExpired(document.expires_at, now))
      .filter((document) => matchesFilters(document, filters))
      .map((document) => ({
        document,
        score: scoreDocument(document, tokens)
      }))
      .filter((item) => item.score > 0 || tokens.length === 0)
      .sort((a, b) => b.score - a.score || b.document.updated_at.localeCompare(a.document.updated_at))
      .slice(0, limit)
      .map((item) => item.document);
  }

  saveProposal(proposal: ProposalRecord): ProposalRecord {
    const proposals = this.readArray<ProposalRecord>("proposals.json");
    const sanitized = redactSecrets(proposal);
    const index = proposals.findIndex((item) => item.proposal_id === sanitized.proposal_id);
    if (index === -1) {
      proposals.push(sanitized);
    } else {
      proposals[index] = sanitized;
    }
    this.writeArray("proposals.json", proposals);
    return sanitized;
  }

  getProposal(proposalId: string): ProposalRecord | undefined {
    return this.readArray<ProposalRecord>("proposals.json").find((proposal) => proposal.proposal_id === proposalId);
  }

  listProposals(limit = 50): ProposalRecord[] {
    return this.readArray<ProposalRecord>("proposals.json")
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }

  private readArray<T>(fileName: string): T[] {
    const path = this.path(fileName);
    try {
      const value = JSON.parse(readFileSync(path, "utf8")) as unknown;
      return Array.isArray(value) ? value as T[] : [];
    } catch (error: unknown) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  private writeArray<T>(fileName: string, records: T[]): void {
    const path = this.path(fileName);
    mkdirSync(dirname(path), { recursive: true });
    const tmpPath = `${path}.tmp`;
    writeFileSync(tmpPath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
    renameSync(tmpPath, path);
  }

  private path(fileName: string): string {
    return join(this.rootDir, fileName);
  }
}

function isExpired(expiresAt: string | undefined, nowMs: number): boolean {
  if (!expiresAt) {
    return false;
  }
  const parsed = Date.parse(expiresAt);
  return Number.isFinite(parsed) && parsed <= nowMs;
}

function matchesFilters(document: StoredDocument, filters: SearchFilters): boolean {
  if (filters.source_types && filters.source_types.length > 0 && !filters.source_types.includes(document.source_type)) {
    return false;
  }
  if (filters.asset_ids && filters.asset_ids.length > 0 && (!document.asset_id || !filters.asset_ids.includes(document.asset_id))) {
    return false;
  }
  if (filters.since && document.updated_at.slice(0, 10) < filters.since) {
    return false;
  }
  if (filters.until && document.updated_at.slice(0, 10) > filters.until) {
    return false;
  }
  return true;
}

function scoreDocument(document: StoredDocument, tokens: string[]): number {
  if (tokens.length === 0) {
    return 1;
  }
  const haystack = `${document.title}\n${document.text}`.toLowerCase();
  return tokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
}
