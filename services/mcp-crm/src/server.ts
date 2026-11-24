import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

type Customer = { id: string; name: string; email: string; tier: string };
const customers: Record<string, Customer> = {
  c1: { id: "c1", name: "Alice Martin", email: "alice@example.com", tier: "gold" },
  c2: { id: "c2", name: "Bruno Leroy", email: "bruno@example.com", tier: "silver" },
};

const text = (v: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(v) }] });

function buildServer() {
  const s = new McpServer({ name: "mcp-crm", version: "0.1.0" });
  s.registerTool(
    "crm_get_customer",
    { description: "Retourne la fiche d'un client (JSON) ou null", inputSchema: { id: z.string() }, annotations: { readOnlyHint: true } },
    async ({ id }) => text(customers[id] ?? null),
  );
  s.registerTool(
    "crm_update_email",
    { description: "Modifie l'email d'un client (ÉCRITURE : exige confirmation utilisateur)", inputSchema: { id: z.string(), email: z.string().email() },
      annotations: { readOnlyHint: false, destructiveHint: true } },
    async ({ id, email }) => {
      const c = customers[id];
      if (!c) return { isError: true, content: [{ type: "text" as const, text: "client inconnu" }] };
      c.email = email;
      return text(c);
    },
  );
  return s;
}

const app = express();
app.use(express.json());
// Mode sans session : un serveur + transport par requête. Aucune authentification : tout passe par la gateway.
app.post("/mcp", async (req, res) => {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => { void transport.close(); void server.close(); });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});
app.get("/healthz", (_q, r) => { r.send("ok"); });
app.listen(Number(process.env.PORT ?? 3100), () => console.log("mcp-crm up"));
