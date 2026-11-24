import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { crmMcp } from "./mcp.js";

// Écriture protégée : l'agent doit afficher ConfirmAction (surface A2UI) avant d'appeler crm_update_email.
export const showConfirm = createTool({
  id: "show_confirm_action",
  description: "Affiche une demande de confirmation à l'utilisateur avant toute écriture.",
  inputSchema: z.object({ summary: z.string() }),
  outputSchema: z.object({ a2ui: z.array(z.any()) }),
  execute: async ({ context }) => ({
    a2ui: [
      { version: "1.0", createSurface: { surfaceId: "confirm", catalogId: "poc/design-catalog/v1" } },
      { version: "1.0", updateComponents: { surfaceId: "confirm", components: [
        { id: "root", component: "ConfirmAction", summary: context.summary, confirmLabel: "Confirmer", cancelLabel: "Annuler" } ] } },
    ],
  }),
});

export async function buildAgent(userToken: string) {
  const tools = await crmMcp(userToken).getTools();
  return new Agent({
    name: "assistant",
    instructions:
      "Tu aides sur le CRM. Pour afficher un client, appelle crm_get_customer puis réponds avec une surface CustomerCard. " +
      "Toute écriture exige d'abord show_confirm_action et l'accord explicite de l'utilisateur.",
    model: process.env.AGENT_MODEL ?? "anthropic/claude-sonnet-4-5",
    tools: { ...tools, showConfirm },
  });
}
