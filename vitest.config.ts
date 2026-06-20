import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@meta-business-mcp/schemas": fileURLToPath(new URL("./packages/schemas/src/index.ts", import.meta.url)),
      "@meta-business-mcp/audit": fileURLToPath(new URL("./packages/audit/src/index.ts", import.meta.url)),
      "@meta-business-mcp/meta-client": fileURLToPath(new URL("./packages/meta-client/src/index.ts", import.meta.url)),
      "@meta-business-mcp/policy": fileURLToPath(new URL("./packages/policy/src/index.ts", import.meta.url)),
      "@meta-business-mcp/proposals": fileURLToPath(new URL("./packages/proposals/src/index.ts", import.meta.url))
    }
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"]
    }
  }
});
