import { MCPClient } from "@mastra/mcp";
// Le jeton utilisateur est propagé (token exchange à brancher : voir README).
export const crmMcp = (bearer: string) =>
  new MCPClient({
    servers: { gateway: { url: new URL(process.env.MCP_GATEWAY_URL!), requestInit: { headers: { Authorization: `Bearer ${bearer}` } } } },
  });
