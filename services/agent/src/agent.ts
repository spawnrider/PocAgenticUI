import { randomUUID } from "node:crypto";
import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { MCPClient } from "@mastra/mcp";
import { z } from "zod";
import { confirmSurface, customerCardSurface } from "./a2ui.js";
import { config } from "./config.js";
import type { ActionStore } from "./store.js";

export type RequestScope = {
  userId: string;
  threadId: string;
  gatewayToken: string; // jeton échangé (audience agentgateway) — jamais de jeton de service partagé
  store: ActionStore;
  toolEnabled: (name: string) => boolean; // flags agent.tool.<nom>
  model?: any; // injectable pour les tests
};

export const WRITE_TOOL = "crm_update_email";

export const INSTRUCTIONS =
  "Tu aides sur le CRM. Pour afficher un client : appelle crm_get_customer puis show_customer_card avec les données reçues. " +
  "Toute écriture (crm_update_email) exige d'abord show_confirm_action (tool, args, summary) ; attends ensuite que l'utilisateur " +
  "confirme via l'interface, puis appelle crm_update_email avec exactement les mêmes arguments. Ne jamais écrire sans cette confirmation.";

export function buildUiTools(s: RequestScope) {
  const show_customer_card = createTool({
    id: "show_customer_card",
    description: "Affiche la fiche d'un client sous forme de surface CustomerCard.",
    inputSchema: z.object({ name: z.string(), email: z.string(), tier: z.string() }),
    execute: async (c) => ({ a2ui: customerCardSurface(c) }),
  });
  const show_confirm_action = createTool({
    id: "show_confirm_action",
    description: "Demande à l'utilisateur de confirmer une écriture AVANT de l'exécuter. Affiche la surface ConfirmAction.",
    inputSchema: z.object({
      summary: z.string(),
      tool: z.literal(WRITE_TOOL),
      args: z.object({ id: z.string(), email: z.string() }),
    }),
    execute: async ({ summary, tool, args }) => {
      const actionId = randomUUID();
      await s.store.create({ id: actionId, threadId: s.threadId, userId: s.userId, tool, args });
      return { actionId, status: "awaiting_user_confirmation", a2ui: confirmSurface(actionId, summary) };
    },
  });
  return { show_customer_card, show_confirm_action };
}

// Outils MCP de la gateway ; l'écriture est enveloppée d'un garde-fou côté serveur (indépendant du LLM).
export async function buildMcpTools(s: RequestScope) {
  const mcp = new MCPClient({
    id: `crm-${s.userId}-${randomUUID()}`,
    servers: { g: { url: new URL(config.gatewayUrl), requestInit: { headers: { Authorization: `Bearer ${s.gatewayToken}` } } } },
  });
  const raw = (await mcp.listTools()) as Record<string, any>;
  const tools: Record<string, any> = {};
  for (const [k, t] of Object.entries(raw)) {
    const name = k.replace(/^g_/, "");
    if (!s.toolEnabled(name)) continue;
    if (name === WRITE_TOOL) {
      const orig = t.execute.bind(t);
      tools[name] = createTool({
        id: name,
        description: t.description,
        inputSchema: t.inputSchema,
        execute: async (input: any, ctx: any) => {
          const ok = await s.store.consume(s.threadId, s.userId, WRITE_TOOL, input);
          if (!ok) return { error: "Écriture refusée : aucune confirmation utilisateur pour ces arguments. Appelle show_confirm_action." };
          return orig(input, ctx);
        },
      });
    } else tools[name] = t;
  }
  return { tools, close: () => mcp.disconnect() };
}

export async function buildAgent(s: RequestScope) {
  const mcp = await buildMcpTools(s);
  const agent = new Agent({
    id: "assistant",
    name: "assistant",
    instructions: INSTRUCTIONS,
    model: s.model ?? config.model,
    tools: { ...mcp.tools, ...buildUiTools(s) },
  });
  return { agent, close: mcp.close };
}
