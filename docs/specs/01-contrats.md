# 01 — Contrats entre composants

## A. Catalogue de composants (design-catalog)
Source de vérité : `packages/design-catalog/catalog.schema.json`, `catalogId = "poc/design-catalog/v1"`.
Composants : `Text{text}`, `Banner{title,body}`, `CustomerCard{name,email,tier}`, `ConfirmAction{summary,confirmLabel,cancelLabel}`.
Tout ajout = schéma + implémentation web + implémentation Flutter + test, dans le même commit.
**À FAIRE (phase 1)** : générer les types TS et Dart depuis le schéma (script `npm run gen:catalog`).

## B. Messages A2UI 1.0 (BFF et agent)
Forme attendue (à confirmer contre la spec 1.0 publiée) :
```json
[
 {"version":"1.0","createSurface":{"surfaceId":"home","catalogId":"poc/design-catalog/v1"}},
 {"version":"1.0","updateComponents":{"surfaceId":"home","components":[{"id":"root","component":"Column","children":["s0"]},{"id":"s0","component":"Banner","title":"…","body":"…"}]}}
]
```
Points de la spec 1.0 à respecter : chaîne de version `"1.0"`, pas de `theme` dans `createSurface`, liaisons `@path`/`@call`, pas de variantes h1–h5.
**À VÉRIFIER** : le composant `Column` fait-il partie du catalogue de base ? sinon l'ajouter au design-catalog.

## C. Contrat BFF
- `GET /screens/:slug?userId=` → tableau de messages A2UI (voir B). 404 si écran inconnu. Sections avec `flagKey` omises si le flag est désactivé pour l'utilisateur.
- `GET /healthz` → 200.
- Cache Redis 30 s par slug (la clé ne doit pas dépendre de l'utilisateur ; le filtrage par flag se fait **après** le cache).

## D. Contrat Strapi
Type `screen` : `slug` (uid), `title`, `sections` (zone dynamique : `sections.banner{title,body,flagKey}`, `sections.text{text,flagKey}`).
Accès via token API en lecture seule (`Authorization: Bearer`). `populate` doit renvoyer le `__component` de chaque section (**À VÉRIFIER** : en Strapi 5 la zone dynamique exige un `populate` explicite).

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
**À VÉRIFIER** : noms de champs exacts du mode standalone selon la version de l'image.

## G. Contrat agent
- Agent Mastra `assistant`. Outils = outils MCP de la gateway + `show_confirm_action`.
- Web : endpoint AG-UI (URL à relever dans la doc Mastra/`@ag-ui/mastra`, supposée `/ag-ui/assistant`).
- Flutter : A2A, Agent Card `/.well-known/assistant/agent-card.json`, endpoint `/a2a/assistant` (préfixe API par défaut `/api` — **À VÉRIFIER**).
- Règle de sécurité : aucun appel à un outil mutateur sans confirmation explicite préalable dans la même conversation.
- Propagation d'identité : jeton utilisateur → token exchange Keycloak → gateway. Interdit : jeton de service partagé en production.

## H. Feature flags (Unleash)
Convention de nommage : `screen.<slug>.<section>`, `agent.enabled`, `agent.tool.<nom>`.
Le BFF utilise le token **client** ; les fronts n'accèdent pas directement à Unleash dans le POC (le BFF filtre). Flutter/web peuvent ensuite utiliser l'API Frontend (token frontend) — hors périmètre initial.
Unleash Edge OSS est en fin de vie fin 2026 : ne pas l'utiliser.

## I. Identité (Keycloak, realm `poc`)
Clients : `web-app` (public, PKCE S256), `mobile-app` (public, PKCE), `agentgateway` (bearer-only). Rôles : `crm-reader`, `crm-writer`. Utilisateur de test : `alice`.
**À FAIRE** : client `agent-service` (confidentiel) autorisé au token exchange vers l'audience `agentgateway`.
