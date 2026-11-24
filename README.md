# ProtoAgenticUI — POC omnicanal headless

POC d'une interface **agentique omnicanale** : un même back-end headless sert un client web (Next.js) et un client mobile (Flutter). L'UI est pilotée par le serveur (A2UI) et un agent conversationnel (Mastra) appelle des outils métier via MCP, derrière une passerelle qui authentifie et autorise chaque appel. Tout le côté serveur est en TypeScript, avec des standards ouverts.

> État réel (vérifié / non vérifié : Flutter, vrai LLM) : `docs/plan/STATUS.md`.

## Ce que fait le POC
- **Écrans pilotés par le serveur (SDUI)** : Strapi stocke les écrans, le BFF les convertit en messages A2UI v0.9 et les filtre selon les feature flags Unleash.
- **Agent conversationnel** : service Mastra exposé en AG-UI (SSE), consommé par CopilotKit côté web. Il affiche des composants (fiche client, demande de confirmation) via des outils d'UI.
- **Outils métier via MCP** : un CRM fictif (`crm_get_customer`, `crm_update_email`) derrière agentgateway.
- **Sécurité** : login Keycloak (PKCE) → échange de token (audience `agentgateway`) → autorisation par outil (CEL). L'écriture exige le rôle `crm-writer` **et** une confirmation explicite de l'utilisateur (surface `ConfirmAction`, vérifiée côté serveur).

## Architecture
Next.js / Flutter → BFF (SDUI Strapi → A2UI) et service agent Mastra (AG-UI) → agentgateway (auth Keycloak, autorisation par outil) → serveurs MCP (CRM fictif). Unleash pour les feature flags, registre MCP (stub). Détails : `docs/specs/00-architecture.md`.

## Prérequis
Docker (ou OrbStack), Node.js ≥ 20 et npm, Python 3 (pour `make e2e`). Flutter uniquement pour le mobile.

## Démarrage
```bash
npm install
make up        # copie .env.example → .env, lance docker compose, attend les services, seed Unleash
```
Strapi est seedé automatiquement au démarrage en dev. Puis le web :
```bash
cp apps/web/.env.example apps/web/.env.local
npm run dev -w @poc/web   # http://localhost:3001
```
Par défaut le LLM est **simulé** (`AGENT_MODEL=mock` dans `.env`) : aucune clé nécessaire. Pour un vrai modèle, renseigner `ANTHROPIC_API_KEY` et `AGENT_MODEL=anthropic/claude-sonnet-4-5` dans `.env`, puis `docker compose up -d agent`.

Vérifications et arrêt :
```bash
make test   # tests unitaires BFF
make e2e    # passerelle + agent de bout en bout
make down   # arrêt de la stack
```

## Utilisateurs par défaut (dev uniquement)
Définis dans `infra/keycloak/realm-poc.json`, le mot de passe est identique au nom d'utilisateur.

| Utilisateur | Mot de passe | Droits |
|---|---|---|
| **alice** (utilisateur par défaut) | `alice` | lecture + écriture CRM (`crm-reader`, `crm-writer`) |
| bob | `bob` | lecture seule (`crm-reader`) |

Se connecter avec **alice / alice** sur http://localhost:3001. Avec bob, la modification d'un e-mail est refusée par la passerelle. Ces identifiants et les secrets du `.env.example` sont des valeurs de dev, à ne jamais réutiliser.

## Services locaux
Keycloak http://localhost:8081 (admin / admin), Unleash http://localhost:4242, Strapi http://localhost:1337, web http://localhost:3001.

## Structure
`infra/` (Postgres, Keycloak realm, agentgateway, registre), `packages/design-catalog`, `services/{bff,agent,mcp-crm,registry,strapi}`, `apps/{web,mobile}`, `docs/`.

Mobile : voir `apps/mobile` (`flutter create .` puis `flutter run --dart-define=HOST=10.0.2.2` sur Android).

## Pour Claude Code
Ouvrir ce dossier avec Claude Code : `CLAUDE.md` pointe vers `docs/specs/` et `docs/plan/00-plan.md`.

## Points restants
Voir `docs/plan/STATUS.md` : Flutter non compilé, A2UI v0.9 (pas de 1.0 publié), A2A non implémenté, registre = stub, test avec un vrai LLM à faire.
