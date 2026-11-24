import { Mastra } from "@mastra/core";
import { PostgresStore } from "@mastra/pg";
import { buildAgent } from "./agent.js";

// NB : l'agent dépend du jeton utilisateur ; en POC on instancie avec un jeton de service.
// À remplacer par une construction par requête (token exchange Keycloak). Voir README.
export const mastra = new Mastra({
  agents: { assistant: await buildAgent(process.env.POC_SERVICE_TOKEN ?? "") },
  storage: new PostgresStore({ connectionString: process.env.DATABASE_URL! }),
  // AG-UI (web) via @ag-ui/mastra et A2A (Flutter) servis par Mastra : à câbler selon la doc de la version installée.
});
