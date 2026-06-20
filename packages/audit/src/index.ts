import type { ToolName } from "@meta-business-mcp/schemas";

const SECRET_PATTERNS = [
  /EAAB[a-zA-Z0-9_-]{20,}/g,
  /(?:access_token|app_secret|client_secret|token|password)["'=:\s]+[A-Za-z0-9._~+/=-]{8,}/gi,
  /Bearer\s+[A-Za-z0-9._~+/=-]{8,}/gi
];

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN = /(?:\+?\d[\d ().-]{7,}\d)/g;

export type AuditResultStatus = "allowed" | "denied" | "failed" | "succeeded";

export type AuditEvent = {
  event_id: string;
  occurred_at: string;
  actor_id: string;
  tenant_id: string;
  tool_name: ToolName | string;
  target_asset_type?: string;
  target_asset_fingerprint?: string;
  request_fingerprint: string;
  policy_decision: "allow" | "deny";
  policy_version: string;
  result_status: AuditResultStatus;
  correlation_id: string;
};

export function redactText(input: string): string {
  return SECRET_PATTERNS.reduce(
    (value, pattern) => value.replace(pattern, "[REDACTED_SECRET]"),
    input
  )
    .replace(EMAIL_PATTERN, "[REDACTED_EMAIL]")
    .replace(PHONE_PATTERN, "[REDACTED_PHONE]");
}

export function redactSecrets<T>(value: T): T {
  if (typeof value === "string") {
    return redactText(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item)) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => {
        if (/token|secret|password|authorization/i.test(key)) {
          return [key, "[REDACTED_SECRET]"];
        }
        return [key, redactSecrets(item)];
      })
    ) as T;
  }
  return value;
}

export function createAuditEvent(input: Omit<AuditEvent, "occurred_at">): AuditEvent {
  return {
    ...input,
    occurred_at: new Date().toISOString()
  };
}
