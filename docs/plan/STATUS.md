# STATUS

Dernière mise à jour : 2026-11-24. Vérifié sur macOS + OrbStack (Docker), Node 24, **sans clé LLM** et **sans SDK Flutter**.

| Tâche | Résultat | Écarts constatés |
|---|---|---|
| T0.1–T0.4 workspaces, tsconfig, pins, git | ✅ `npm install`, `npm run typecheck` verts ; versions épinglées (Mastra 1.85.0, @mastra/mcp 2.10.0, @ag-ui/mastra 2.0.2, CopilotKit 1.90.2, @a2ui/react 0.15.0, next 15.5.29, agentgateway v1.7.0, Strapi 5.63.0) | Mastra exige zod ^4 (agent, mcp-crm) ; apps/web reste en zod 3 (peer d'@a2ui/react). Doublons conservés : dossier `platform/` (ancien brouillon) et `services/bff/src/index.ts`, `services/mcp-crm/src/index.ts` (exclus du typecheck) — à supprimer. |
| T1.1 Keycloak/Unleash/Postgres | ✅ `.well-known` répond sur :8081, Unleash :4242 | Realm : ajout bob, `agent-service`, `poc-cli`, mappers (audience, claim `roles`), rôle client `agentgateway/access`. `KC_HOSTNAME_BACKCHANNEL_DYNAMIC`. Unleash épinglé `7`. |
| T1.2 Strapi | ✅ projet généré (JS), `GET /api/screens` → 200 avec token, 403 sans | Routes/contrôleur/service manquaient. Seed dev (`SEED_DEV=true`) : token lecture seule à valeur fixe + écran `home`. |
| T1.3 flags Unleash | ✅ `scripts/seed-unleash.sh` | Token admin dev via `INIT_ADMIN_API_TOKENS` (appliqué seulement à l'init de la base). |
| T1.4 génération types TS/Dart | ❌ non fait | Types écrits à la main. |
| T2.1 MCP CRM | ✅ tools/list + appel testés | `registerTool` ; zod 4 requis (TS2589 sinon). |
| T2.2–T2.4 gateway | ✅ `scripts/e2e-mcp.sh` : 401 sans jeton, lecture OK, écriture refusée pour bob, OK pour alice | La config d'origine était valide telle quelle ; sessions MCP obligatoires. |
| T3.1–T3.3 BFF | ✅ 3 tests Vitest ; flag off → pas de Banner, on → Banner (cache Redis non dépendant de l'utilisateur) | Fastify/Express dupliqués → Express. A2UI **v0.9**, pas 1.0. |
| T3.4 validation schéma A2UI | ⚠️ partielle | Pas de validateur officiel 1.0 ; les messages sont acceptés par le `MessageProcessor` v0.9 côté web. |
| T4.1–T4.5 agent | ✅ `python3 scripts/e2e_agent.py` : lecture→CustomerCard ; écriture→ConfirmAction sans écriture avant confirmation ; id bidon refusé ; confirmation non rejouable ; token exchange ; flags `agent.enabled`/`agent.tool.*` | **Test avec LLM simulé** (`AGENT_MODEL=mock`, `mock-model.ts`) : aucune clé `ANTHROPIC_API_KEY`. Le comportement avec un vrai modèle n'est pas vérifié. Pas de suspend/resume Mastra : garde-fou serveur (`pending_actions`, Postgres). Pas de `mastra dev` ni A2A : serveur Express + `MastraAgent`. |
| T5.1–T5.4 web | ✅ parcours manuel navigateur : login Keycloak PKCE → écran SDUI → chat → CustomerCard → ConfirmAction → Confirmer → « Email mis à jour » | CopilotKit 1.90 : runtime **v2** (`createCopilotRuntimeHandler`) et `useRenderTool` (les API v1 ne fonctionnent pas). `maplibre-gl` requis. Test Playwright non écrit. Le message `CONFIRM:<id>` est visible dans le chat. |
| T6.x Flutter | ⚠️ **code écrit, jamais compilé** | Pas de SDK Flutter : `flutter analyze/test` non exécutés. genui/genui_a2a abandonnés (API invérifiable, A2A non implémenté) : rendu A2UI minimal maison + AG-UI SSE. |
| T7 registre / finitions | ⚠️ partiel | Registre = stub conservé (pas de ToolHive, l'agent ne découvre pas le CRM via le registre). Makefile (`make up/e2e/test`). Pas de Langfuse/OTel. |

## Rejouer
`make up` puis `make e2e` et `npm test`. Web : `cp apps/web/.env.example apps/web/.env.local && npm run dev -w @poc/web` → http://localhost:3001 (alice/alice). Avec un vrai LLM : `AGENT_MODEL=anthropic/claude-sonnet-4-5` + `ANTHROPIC_API_KEY` dans `.env`.
