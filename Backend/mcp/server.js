import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import { TavilySearch } from "@langchain/tavily";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";




const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({
  path:path.resolve(__dirname,"../.env")
})


const server = new McpServer({
  name: "nexora-mcp-server",
  version: "1.0.0",
});


const tavilySearch = new TavilySearch({
  maxResults: 5,
  topic: "general",
  tavilyApiKey:process.env.TAVILY_API_KEY
});

server.registerTool(
  "web",
  {
    description:
      "search the query ion internet using tool.",
    inputSchema: z.object({
      query:z.string()
    }),
  },
  async ({query}) => {
    try {
      const result = await tavilySearch.invoke({query})

      return {
        content:[
          {
            type:"text",
            text:JSON.stringify(result)
          }
        ]
      }
    } catch (error) {
return {
        content:[
          {
            type:"text",
            text:"Failed to get result"
          }
        ]
      }    }
  }
);

 const main=async()=>{
  const transport = new StdioServerTransport();

  await server.connect(transport);

  console.error(" MCP Server started successfully.");
}

main().catch((error)=>{
console.log("MCP Server error", error)
process.exit(1)
})