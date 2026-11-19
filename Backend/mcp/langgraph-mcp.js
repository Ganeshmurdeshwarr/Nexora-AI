import { MCPAdapter } from "@langchain/mcp-adapters";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv"
dotenv.config()

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverPath = path.join(__dirname, "server.js");

const adapter = new MCPAdapter({
  servers: {
    nexora: {
      transport: "stdio",
      command: process.execPath,
      args: [serverPath],
    },
  },
});

export async function getMCPTools() {
  const tools = await adapter.listTools();

  console.log(
    "Loaded MCP tools:",
    tools.map((tool) => tool.name)
  );

  return tools;
}

export async function closeMCPAdapter() {
  await adapter.close();
}