// CRM factice exposé en MCP (Streamable HTTP, sans état). NON TESTÉ : vérifier l'API du SDK installé.
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const customers: Record<string, { id: string; name: string; email: string; tier: string }> = {
  c1: { id: "c1", name: "Alice Martin", email: "alice@example.com", tier: "gold" },
  c2: { id: "c2", name: "Bruno Leroy", email: "bruno@example.com", tier: "silver" },
};

function build() {
  const s = new McpServer({ name: "mcp-crm", version: "0.1.0" });
  s.tool("crm_get_customer", "Lit une fiche client par id", { id: z.string() }, async ({ id }) => ({
    content: [{ type: "text", text: JSON.stringify(customers[id] ?? null) }],
  }));
  s.tool("crm_update_email", "Modifie l'email d'un client (écriture)", { id: z.string(), email: z.string().email() },
    async ({ id, email }) => {
      if (!customers[id]) return { isError: true, content: [{ type: "text", text: "client inconnu" }] };
      customers[id].email = email;
      return { content: [{ type: "text", text: JSON.stringify(customers[id]) }] };
    });
  return s;
}

const app = express();
app.use(express.json());
app.post("/mcp", async (req, res) => {
  const server = build();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => { transport.close(); server.close(); });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});
app.listen(3101, () => console.log("mcp-crm :3101"));
