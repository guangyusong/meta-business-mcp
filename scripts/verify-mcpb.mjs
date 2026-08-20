import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const bundlePath = resolve(process.argv[2] ?? "dist/meta-business-mcp-0.1.1.mcpb");
const unpackDir = mkdtempSync(join(tmpdir(), "meta-business-mcp-verify-"));
const npxArgs = ["--yes", "@anthropic-ai/mcpb@2.1.2"];
const npmExecPath = process.env.npm_execpath;
const npxCommand = process.platform === "win32" && npmExecPath ? process.execPath : "npx";
const npxCommandArgs = process.platform === "win32" && npmExecPath
  ? [join(dirname(npmExecPath), "npx-cli.js"), ...npxArgs]
  : npxArgs;

try {
  execFileSync(npxCommand, [
    ...npxCommandArgs,
    "unpack",
    bundlePath,
    unpackDir
  ], { stdio: "pipe" });

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(unpackDir, "apps/server/dist/index.js"), "--transport", "stdio"],
    env: {
      ...process.env,
      META_ADS_TOKEN: "EAAR_test_token_not_live",
      META_AD_ACCOUNT_IDS: "act_1234567890",
      META_BUSINESS_MCP_STORAGE_DIR: join(unpackDir, "storage")
    },
    stderr: "inherit"
  });
  const client = new Client({ name: "meta-business-mcp-bundle-verifier", version: "0.1.1" });
  await client.connect(transport);
  const { tools } = await client.listTools();
  const toolNames = tools.map((tool) => tool.name);

  if (toolNames.includes("meta_proposal_execute")) {
    throw new Error("The default bundle must not advertise meta_proposal_execute.");
  }
  if (!toolNames.includes("meta_ads_insights_query")) {
    throw new Error("The bundle did not advertise the expected read tools.");
  }

  console.log(JSON.stringify({
    bundle: bundlePath,
    tool_count: toolNames.length,
    external_execution_advertised: false
  }, null, 2));
  await client.close();
} finally {
  rmSync(unpackDir, { recursive: true, force: true });
}
