# ProtoAgenticUI — POC omnicanal headless

> **Squelette NON TESTÉ.** Écrit sans docker, flutter ni accès réseau : rien n'a été installé, construit ni lancé. Attendez-vous à ajuster versions et noms d'API.

## Architecture
Flutter + Next.js → BFF (SDUI Strapi → A2UI 1.0) et service agent Mastra (AG-UI web, A2A Flutter) → agentgateway (auth Keycloak, autorisation par outil) → serveurs MCP (CRM fictif). Unleash pour les feature flags, registre privé de serveurs MCP.

## Démarrage
```
cp .env.example .env
docker compose up -d postgres keycloak unleash strapi redis
# Strapi : générer le projet (voir services/strapi/Dockerfile), créer un token API → .env (STRAPI_API_TOKEN),
# créer l'écran "home" avec une section banner.
docker compose up -d --build
```
Web : `cd apps/web && npm install && npm run dev` (port 3001). Utilisateur Keycloak : alice / alice.

## Pour Claude Code
Ouvrir ce dossier avec Claude Code : `CLAUDE.md` pointe vers `docs/specs/` et `docs/plan/00-plan.md`.

## Structure
`infra/` (Postgres, Keycloak realm, agentgateway, registre), `packages/design-catalog`, `services/{bff,agent,mcp-crm,registry,strapi}`, `apps/{web,mobile}`.

## Points non vérifiés (à valider en premier)
1. Version A2UI émise par `@ag-ui/mastra` et API 1.0 de `@a2ui/react` (docs vues : 0.x).
2. Version A2A parlée par `genui_a2a`, et API réelle de genui 0.10 (le `main.dart` n'est qu'un stub).
3. `infra/agentgateway/config.yaml` : champs `mcpAuthentication` / `mcpAuthorization` à confirmer pour le mode standalone Docker.
4. Câblage AG-UI / A2A dans `services/agent/src/index.ts` (non écrit), URL `/ag-ui/assistant` supposée.
5. Token exchange Keycloak : l'agent utilise un jeton de service (`POC_SERVICE_TOKEN`) au lieu du jeton utilisateur.
6. Le « registre » est un stub ; à remplacer par ToolHive Registry Server.
7. Auth.js côté web et flutter_appauth côté mobile : non branchés.
8. Versions `latest` à épingler (Mastra évolue vite).
9. Schéma Strapi minimal ; flags Unleash à créer (`screen.home.offer-banner`, `agent.enabled`).
