# 00 — Architecture

## Objectif du POC
Prouver, sur Docker Compose : (1) un écran piloté par Strapi (SDUI) rendu sur web et Flutter ; (2) une conversation où l'agent affiche une fiche client issue d'un CRM fictif via MCP ; (3) une écriture protégée par confirmation ; (4) feature flags Unleash découplés de Strapi ; (5) identité Keycloak de bout en bout.

## Composants
| Composant | Rôle | Techno | Port |
|---|---|---|---|
| web | Front web + chat | Next.js, CopilotKit, @a2ui/react | 3001 |
| mobile | App mobile | Flutter, genui, genui_a2a | — |
| bff | SDUI : Strapi → A2UI, filtre par flags, cache | Express, unleash-client, ioredis | 4000 |
| agent | Agent IA, AG-UI (web **et** Flutter, SSE), MCP client | Mastra (Agent/MCPClient) + serveur Express | 4111 |
| agentgateway | Point d'accès unique aux MCP, authN/authZ | agentgateway | 3000 |
| mcp-crm | Serveur MCP CRM fictif | @modelcontextprotocol/sdk | 3100 (interne) |
| registry | Registre privé de serveurs MCP | stub → ToolHive Registry Server | 8090 |
| strapi | CMS : écrans/sections | Strapi 5 | 1337 |
| unleash | Feature flags | Unleash OSS | 4242 |
| keycloak | Identité | Keycloak 26.x | 8081 |

## Flux
1. **Écran** : client → BFF `GET /screens/:slug` → Strapi (token API) → filtre sections par flag Unleash → messages A2UI v0.9 → rendu client.
2. **Chat web** : web → `/api/copilotkit` → AG-UI → agent → (MCP via gateway) → réponse + surfaces A2UI.
3. **Chat Flutter** : app → AG-UI SSE direct (`POST /ag-ui/assistant`, jeton Keycloak de l'app) → agent → idem. (A2A non implémenté : voir STATUS.)
4. **Écriture** : l'agent appelle `show_confirm_action` → surface `ConfirmAction` → accord utilisateur → seulement alors `crm_update_email`.
5. **Auth** : le client obtient un jeton Keycloak (PKCE) ; l'agent l'échange (token exchange) pour un jeton à audience `agentgateway` ; la gateway valide le JWT et applique des règles CEL par outil/rôle.

## Décisions figées
- TypeScript partout côté serveur ; Flutter pour mobile ; Next.js pour web.
- A2UI **v0.9** de bout en bout (VÉRIFIÉ : `@a2ui/react` 0.15 ne parle que v0.9 et v0.8 ; il n'existe pas de 1.0 publié). Le middleware A2UI intégré de CopilotKit n'est pas utilisé : rendu par `@a2ui/react/v0_9` avec un catalogue custom.
- Strapi et Unleash sont indépendants : Strapi ne stocke qu'une `flagKey` (chaîne) par section.
- Mastra pour l'agent (Agent, MCPClient, outils) ; le serveur HTTP est un Express maison (`services/agent/src/server.ts`) qui expose l'agent via `MastraAgent` de `@ag-ui/mastra`, construit **par requête**. `mastra dev` n'est pas utilisé.
- Garde-fou d'écriture **côté serveur** (table Postgres `pending_actions`) : indépendant du LLM.

Décisions détaillées : `docs/adr/`.

## Hors périmètre
Kubernetes, observabilité complète (Langfuse/OTel optionnels en phase 7), multi-tenant.
