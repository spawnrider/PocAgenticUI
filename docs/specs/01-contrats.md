# 01 — Contrats entre composants

## A. Catalogue de composants (design-catalog)
Source de vérité : `packages/design-catalog/catalog.schema.json`, `catalogId = "poc/design-catalog/v1"`.
Composants : `Text{text}`, `Banner{title,body}`, `CustomerCard{name,email,tier}`, `ConfirmAction{summary,confirmLabel,cancelLabel}`.
Tout ajout = schéma + implémentation web + implémentation Flutter + test, dans le même commit.
**Écart** : types TS/Dart non générés depuis le schéma (implémentations écrites à la main, tests des deux côtés).

## B. Messages A2UI v0.9 (BFF et agent) — VÉRIFIÉ contre @a2ui/react 0.15
Forme :
```json
[
 {"version":"v0.9","createSurface":{"surfaceId":"home","catalogId":"poc/design-catalog/v1"}},
 {"version":"v0.9","updateComponents":{"surfaceId":"home","components":[{"id":"root","component":"Column","children":["s0"]},{"id":"s0","component":"Banner","title":"…","body":"…"}]}}
]
```
Chaîne de version `"v0.9"` ; liaisons `{path:'/x'}` ; `Column`/`Text` sont réimplémentés dans le catalogue custom (apps/web/lib/catalog.tsx) car le catalogue de base est en Custom Elements. `ConfirmAction` porte en plus un `actionId` (corrélation avec le garde-fou serveur).

## C. Contrat BFF
- `GET /screens/:slug?userId=` → tableau de messages A2UI (voir B). 404 si écran inconnu. Sections avec `flagKey` omises si le flag est désactivé pour l'utilisateur.
- `GET /healthz` → 200.
- Cache Redis 30 s par slug (la clé ne doit pas dépendre de l'utilisateur ; le filtrage par flag se fait **après** le cache).

## D. Contrat Strapi
Type `screen` : `slug` (uid), `title`, `sections` (zone dynamique : `sections.banner{title,body,flagKey}`, `sections.text{text,flagKey}`).
Accès via token API en lecture seule (`Authorization: Bearer`). `populate` doit renvoyer le `__component` de chaque section (VÉRIFIÉ : `populate[sections][populate]=*` renvoie `__component` et les champs).

## E. Contrat MCP (mcp-crm)
Transport Streamable HTTP sans session, endpoint `POST /mcp`.
| Outil | Entrée | Sortie | Écriture |
|---|---|---|---|
| `crm_get_customer` | `id` | JSON client ou `null` | non |
| `crm_update_email` | `id`, `email` | JSON client mis à jour | **oui** |
Le serveur ne fait **aucune** authentification : tout passe par la gateway.

## F. Contrat agentgateway
- Entrée `:3000/mcp`. Fédère les cibles MCP (préfixage des outils si plusieurs cibles).
- `mcpAuthentication` : JWT Keycloak, audience `agentgateway`.
- `mcpAuthorization` (CEL) : `crm_get_customer` autorisé à tout jeton valide ; `crm_update_email` exige le rôle `crm-writer`.
- Exposer les métadonnées de ressource protégée (RFC 9728).
VÉRIFIÉ avec l'image `v1.7.0` (config acceptée telle quelle ; sessions MCP obligatoires : `initialize` puis `Mcp-Session-Id`). L'issuer du jeton est `http://localhost:8081/realms/poc` (KC_HOSTNAME fixe) ; le JWKS est lu via `keycloak:8081`. Rôles lus dans le claim `roles`.

## G. Contrat agent
- Agent Mastra `assistant`. Outils = outils MCP de la gateway + `show_confirm_action`.
- AG-UI : `POST /ag-ui/assistant` (SSE), `Authorization: Bearer <jeton utilisateur, aud=agent-service>`. Utilisé par le web (via le runtime CopilotKit v2 `/api/copilotkit`) et par Flutter.
- A2A : non implémenté.
- Surfaces : outils `show_customer_card` et `show_confirm_action`, résultat `{a2ui:[…]}` rendu par les fronts (hook `useRenderTool`).
- Décision utilisateur : message `CONFIRM:<actionId>` / `CANCEL:<actionId>` ; le serveur l'enregistre (`pending_actions`) ; `crm_update_email` est refusé sauf action confirmée pour exactement ces arguments, une seule fois.
- Règle de sécurité : aucun appel à un outil mutateur sans confirmation explicite préalable dans la même conversation.
- Propagation d'identité : jeton utilisateur → token exchange Keycloak → gateway. Interdit : jeton de service partagé en production.

## H. Feature flags (Unleash)
Convention de nommage : `screen.<slug>.<section>`, `agent.enabled`, `agent.tool.<nom>`.
Le BFF utilise le token **client** ; les fronts n'accèdent pas directement à Unleash dans le POC (le BFF filtre). Flutter/web peuvent ensuite utiliser l'API Frontend (token frontend) — hors périmètre initial.
Unleash Edge OSS est en fin de vie fin 2026 : ne pas l'utiliser.

## I. Identité (Keycloak, realm `poc`)
Clients : `web-app` (public, PKCE S256), `mobile-app` (public, PKCE), `agentgateway` (bearer-only). Rôles : `crm-reader`, `crm-writer`. Utilisateur de test : `alice`.
Client `agent-service` (confidentiel, secret de dev) : standard token exchange activé. Prérequis VÉRIFIÉ : l'audience cible n'est accordée que si l'utilisateur a un rôle client sur `agentgateway` (rôle `access`). `web-app`/`mobile-app` ajoutent l'audience `agent-service`. Client `poc-cli` (password grant) réservé aux scripts de test. Utilisateurs : `alice` (reader+writer), `bob` (reader).
