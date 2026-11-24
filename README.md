# ProtoAgenticUI — POC omnicanal headless

> Voir `docs/plan/STATUS.md` pour l'état réel (ce qui est vérifié, ce qui ne l'est pas : Flutter, vrai LLM).

## Architecture
Flutter + Next.js → BFF (SDUI Strapi → A2UI 1.0) et service agent Mastra (AG-UI web, A2A Flutter) → agentgateway (auth Keycloak, autorisation par outil) → serveurs MCP (CRM fictif). Unleash pour les feature flags, registre privé de serveurs MCP.

## Démarrage
```
make up        # compose + seed Unleash (Strapi est seedé au démarrage en dev)
make e2e       # gateway + agent (LLM simulé par défaut : AGENT_MODEL=mock)
cp apps/web/.env.example apps/web/.env.local && npm run dev -w @poc/web   # http://localhost:3001
```
Utilisateurs Keycloak : alice / alice (lecture+écriture), bob / bob (lecture seule). Mobile : voir `apps/mobile` (`flutter create .` puis `flutter run --dart-define=HOST=10.0.2.2` sur Android).

## Pour Claude Code
Ouvrir ce dossier avec Claude Code : `CLAUDE.md` pointe vers `docs/specs/` et `docs/plan/00-plan.md`.

## Structure
`infra/` (Postgres, Keycloak realm, agentgateway, registre), `packages/design-catalog`, `services/{bff,agent,mcp-crm,registry,strapi}`, `apps/{web,mobile}`.

## Points restants
Voir `docs/plan/STATUS.md` : Flutter non compilé, A2UI v0.9 (pas de 1.0 publié), A2P/A2A non implémenté, registre = stub, test avec un vrai LLM à faire.
