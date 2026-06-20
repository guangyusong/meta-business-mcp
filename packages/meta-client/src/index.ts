export type MetaOperation =
  | "ad_accounts.list"
  | "campaigns.list"
  | "ads.insights.query"
  | "pages.list"
  | "instagram_accounts.list";

export type MetaRequestSpec = {
  operation: MetaOperation;
  method: "GET";
  pathTemplate: string;
  allowedFields: readonly string[];
};

export const META_GRAPH_API_VERSION = "v25.0";

export const ALLOWED_META_REQUESTS: Record<MetaOperation, MetaRequestSpec> = {
  "ad_accounts.list": {
    operation: "ad_accounts.list",
    method: "GET",
    pathTemplate: "/me/adaccounts",
    allowedFields: ["id", "name", "currency", "timezone_name", "account_status", "disable_reason"]
  },
  "campaigns.list": {
    operation: "campaigns.list",
    method: "GET",
    pathTemplate: "/act_{ad_account_id}/campaigns",
    allowedFields: ["id", "name", "objective", "configured_status", "effective_status", "buying_type", "updated_time"]
  },
  "ads.insights.query": {
    operation: "ads.insights.query",
    method: "GET",
    pathTemplate: "/act_{ad_account_id}/insights",
    allowedFields: ["account_id", "campaign_id", "adset_id", "ad_id", "date_start", "date_stop", "spend", "impressions", "reach", "clicks", "actions"]
  },
  "pages.list": {
    operation: "pages.list",
    method: "GET",
    pathTemplate: "/me/accounts",
    allowedFields: ["id", "name", "category", "tasks", "instagram_business_account"]
  },
  "instagram_accounts.list": {
    operation: "instagram_accounts.list",
    method: "GET",
    pathTemplate: "/{page_id}",
    allowedFields: ["instagram_business_account"]
  }
};

export class MetaClientBoundary {
  constructor(
    private readonly apiVersion = META_GRAPH_API_VERSION
  ) {}

  describe(operation: MetaOperation): MetaRequestSpec & { apiVersion: string } {
    return {
      ...ALLOWED_META_REQUESTS[operation],
      apiVersion: this.apiVersion
    };
  }

  describeAll(): Array<MetaRequestSpec & { apiVersion: string }> {
    return Object.keys(ALLOWED_META_REQUESTS).map((operation) =>
      this.describe(operation as MetaOperation)
    );
  }

  graphRequest(): never {
    throw new Error("Arbitrary Graph API requests are prohibited. Add a named, allowlisted operation instead.");
  }

  assertReadOnly(): void {
    const mutating = this.describeAll().filter((request) => request.method !== "GET");
    if (mutating.length > 0) {
      throw new Error(`Mutating Meta operations are not allowed in v1: ${mutating.map((request) => request.operation).join(", ")}`);
    }
  }
}
