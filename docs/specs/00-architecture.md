# 00 — Architecture

## Objectif du POC
Prouver, sur Docker Compose : (1) un écran piloté par Strapi (SDUI) rendu sur web et Flutter ; (2) une conversation où l'agent affiche une fiche client issue d'un CRM fictif via MCP ; (3) une écriture protégée par confirmation ; (4) feature flags Unleash découplés de Strapi ; (5) identité Keycloak de bout en bout.

## Composants
| Composant | Rôle | Techno | Port |
|---|---|---|---|
| web | Front web + chat | Next.js, CopilotKit, @a2ui/react | 3001 |
| mobile | App mobile | Flutter, genui, genui_a2a | — |
| bff | SDUI : Strapi → A2UI, filtre par flags, cache | Express, unleash-client, ioredis | 4000 |
| agent | Agent IA, AG-UI (web) + A2A (Flutter), MCP client | Mastra | 4111 |
| agentgateway | Point d'accès unique aux MCP, authN/authZ | agentgateway | 3000 |
| mcp-crm | Serveur MCP CRM fictif | @modelcontextprotocol/sdk | 3100 (interne) |
| registry | Registre privé de serveurs MCP | stub → ToolHive Registry Server | 8090 |
| strapi | CMS : écrans/sections | Strapi 5 | 1337 |
| unleash | Feature flags | Unleash OSS | 4242 |
| keycloak | Identité | Keycloak 26.x | 8081 |

## Flux
1. **Écran** : client → BFF `GET /screens/:slug` → Strapi (token API) → filtre sections par flag Unleash → messages A2UI 1.0 → rendu client.
2. **Chat web** : web → `/api/copilotkit` → AG-UI → agent → (MCP via gateway) → réponse + surfaces A2UI.
3. **Chat Flutter** : app → A2A (`/a2a/assistant`) → agent → idem.
4. **Écriture** : l'agent appelle `show_confirm_action` → surface `ConfirmAction` → accord utilisateur → seulement alors `crm_update_email`.
5. **Auth** : le client obtient un jeton Keycloak (PKCE) ; l'agent l'échange (token exchange) pour un jeton à audience `agentgateway` ; la gateway valide le JWT et applique des règles CEL par outil/rôle.

## Décisions figées
- TypeScript partout côté serveur ; Flutter pour mobile ; Next.js pour web.
- A2UI **1.0** de bout en bout. Le middleware A2UI intégré de CopilotKit (0.9) est désactivé.
- Strapi et Unleash sont indépendants : Strapi ne stocke qu'une `flagKey` (chaîne) par section.
- Mastra pour l'agent ; fort risque de dérive d'API → versions épinglées.

## Hors périmètre
Kubernetes, observabilité complète (Langfuse/OTel optionnels en phase 7), multi-tenant.
