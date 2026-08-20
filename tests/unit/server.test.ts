import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { createServer, isMainModule } from "../../apps/server/src/index.js";

describe("MCP server skeleton", () => {
  it("constructs without enabling a transport", () => {
    const server = createServer();
    expect(server.isConnected()).toBe(false);
  });

  it("recognizes an entrypoint reached through a symlinked install path", () => {
    const directory = mkdtempSync(join(tmpdir(), "meta-business-main-module-"));
    try {
      const realEntry = join(directory, "server.js");
      const linkedEntry = join(directory, "linked-server.js");
      writeFileSync(realEntry, "// test entrypoint\n");
      symlinkSync(realEntry, linkedEntry);
      expect(isMainModule(pathToFileURL(realEntry).href, linkedEntry)).toBe(true);
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });
});
