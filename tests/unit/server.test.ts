import { describe, expect, it } from "vitest";
import { createServer } from "../../apps/server/src/index.js";

describe("MCP server skeleton", () => {
  it("constructs without enabling a transport", () => {
    const server = createServer();
    expect(server.isConnected()).toBe(false);
  });
});
