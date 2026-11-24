# Architecture omnicanale headless, MCP et generative UI

> Transposé depuis le Claude Doc (onglet *Vue d'ensemble*, rév. 28, 23 nov. 2026). Le détail technique est dans [02-architecture-detaillee.md](02-architecture-detaillee.md) ; les schémas sont dans [diagrammes.md](diagrammes.md).

**Décisions au 24 novembre 2026** : app Flutter (transport A2A), front Next.js (AG-UI), TypeScript partout (BFF et service agent Mastra), Strapi pour le contenu, Unleash pour les flags, agentgateway, Keycloak, registre ToolHive. Ce document explique les choix.

## Principe : une couche, un protocole

L'architecture sépare trois questions : comment l'IA découvre les services du SI (MCP + registre), comment les fronts parlent à l'agent (AG-UI sur le web, A2A sur Flutter), et quelle UI l'agent renvoie (A2UI ou MCP Apps). Strapi pilote la composition des écrans, Unleash le feature flipping.

Ces protocoles sont complémentaires, pas concurrents :

| Couche | Protocole | Rôle |
|---|---|---|
| Front ↔ back (runtime) | AG-UI (web), A2A (Flutter) | Transporte messages, appels d'outils, état et surfaces UI |
| Agent ↔ outils du SI | MCP | Expose CRM, CMS, commerce comme tools |
| Agent ↔ agent | A2A | Délègue des tâches à des agents métier |
| UI générée (déclarative) | A2UI | Décrit l'UI, rendue avec les composants natifs de l'app |
| UI générée (ouverte) | MCP Apps | UI HTML en iframe sandboxée, aussi dans Claude/ChatGPT |

AG-UI n'est pas une spec de generative UI : A2UI ou MCP Apps disent quoi afficher, AG-UI dit comment cela circule entre back et front.

Les assistants IA atteignent la gateway directement ; le web et le mobile passent par le BFF et le service agent. La gateway route vers chaque MCP server et s'appuie sur le registre pour la découverte (schéma « vue d'ensemble » dans [diagrammes.md](diagrammes.md)).

## 1. Le SI exposé en MCP

Chaque domaine du SI expose un MCP server, sur la spec MCP 2026-07-28.

- **Spec cible** : la version 2026-07-28 rend le cœur du protocole sans état (plus de session ni de handshake). Une requête peut atterrir sur n'importe quelle instance derrière un load balancer round-robin : les MCP servers se déploient comme des microservices HTTP classiques. MCP Apps et l'Enterprise Managed Authorization y sont des extensions officielles.
- **Strapi** : MCP server intégré depuis Strapi 5.47.0, GA en 5.49.0. Il liste, crée, modifie, publie et dépublie le contenu ; authentification par Admin token en Bearer ; des plugins peuvent ajouter des tools via le service `strapi.ai.mcp`.
- **CRM, commerce, ERP** : un MCP server par domaine, écrit avec le SDK TypeScript officiel.
- **Règle de conception** : MCP n'est pas l'API produit. Garder des APIs métier propres (OpenAPI) et concevoir les MCP servers comme des adaptateurs par cas d'usage (« trouver un client », « créer une opportunité »), pas comme un miroir 1:1 du CRUD.

## 2. Discovery : registre privé et cards

La découverte des services passe par un registre privé compatible avec l'API du registre MCP officiel.

- **Pourquoi privé** : le registre MCP officiel ne prend pas les serveurs privés et recommande d'héberger son propre registre. Son code n'est pas prévu pour l'auto-hébergement ; le modèle prévu est le subregistry, qui réplique le dataset officiel, ajoute ses métadonnées et sa politique, et reste compatible au niveau de l'API.
- **Décision** : le Registry Server de ToolHive (Apache 2.0), déployé seul, qui implémente l'API du registre MCP officiel (format `server.json`). Le service agent, les IDE et la génération de la configuration de la gateway s'y appuient.
- **Server Cards** : métadonnées publiées par chaque serveur en `.well-known`. La SEP-2127 est encore en draft et le chemin n'est pas figé : les publier en complément, sans en dépendre.
- **Agents A2A** : chaque agent publie sa card à `/.well-known/agent-card.json`. A2A 1.0 (mars 2026) ajoute les agent cards signées. Le registre référence donc les MCP servers (outils) et les agents A2A (délégation).

## 3. Gateway MCP / A2A

Une gateway unique contrôle tout le trafic agentique : authentification (OAuth 2.1 + IdP), ACL par tool, rate limiting, audit.

- **Décision** : agentgateway (open source, projet de l'Agentic AI Foundation). Une seule gateway pour HTTP, gRPC, MCP, A2A et les appels LLM.
- **Écartée** : Kong AI Gateway, pertinente seulement si Kong Konnect avait déjà été en place.
- **Pattern clé** : l'agent ne charge pas 200 tools. Il interroge le registre (tool search), la gateway filtre les tools selon l'identité de l'utilisateur, et le service agent selon les flags Unleash.

## 4. BFF et service agent

Deux services TypeScript séparés servent deux chemins ; le chemin déterministe reste majoritaire.

- **BFF, chemin déterministe** : écrans pilotés par Strapi, flags Unleash, données métier via agentgateway, le tout rendu en A2UI. Sans LLM : rapide, peu coûteux, testable.
- **Service agent, chemin agentique** : Mastra, client MCP de la gateway. Il parle AG-UI au web et A2A (v0.3 ou v1.0) à l'app Flutter.
- **Côté web** : CopilotKit pour le chat et le runtime AG-UI ; rendu A2UI 1.0 avec le renderer officiel `@a2ui/react`, car le middleware A2UI intégré à CopilotKit parle encore la version 0.9.

## 5. Generative UI : trois patterns à combiner

A2UI porte l'UI first-party, MCP Apps les widgets riches et l'exposition dans les assistants IA, AG-UI les interactions contrôlées.

| Pattern | Standard | Contrôle / liberté | Usage dans l'architecture |
|---|---|---|---|
| Contrôlé | AG-UI (frontend tools) | Fort contrôle, peu de liberté | Composants codés déclenchés par l'agent |
| Déclaratif | A2UI 1.0, json-render, Open-JSON-UI | Contrôle partagé | Cœur de l'UI first-party web et mobile |
| Ouvert | MCP Apps | Peu de contrôle, forte liberté | Widgets riches ou tiers, exposition dans Claude/ChatGPT |

- **A2UI 1.0** (Google, 11 novembre 2026) : première version stable. L'agent décrit l'écran, chaque app le dessine avec ses composants natifs ; la 1.0 ajoute les appels de fonction bidirectionnels. Renderers : React, Angular, Lit, Flutter, SwiftUI, Jetpack Compose (Compose encore en v0.9.1).
- **MCP Apps** (extension `io.modelcontextprotocol/ui`, stable depuis le 26 janvier 2026) : fusion de MCP-UI et de l'Apps SDK d'OpenAI, UI HTML en iframe sandboxée. Les renderers web et Flutter d'A2UI tournent aussi dans MCP Apps : un même écran sert l'app et les assistants IA.
- **json-render** (Vercel) : catalogue de composants en Zod qui contraint l'IA, avec un package MCP Apps. **Open-JSON-UI** : standardisation ouverte du schéma de generative UI d'OpenAI.

### Choix mobile

| Option | Renderer A2UI | Partage avec le web | Verdict |
|---|---|---|---|
| Flutter (GenUI SDK) | Officiel, stable | Faible (sauf Flutter web) | Le plus sûr aujourd'hui |
| React Native / Expo | Communautaire, v0.8 | Fort (TypeScript) | Prévoir un adaptateur maison sur le core A2UI |
| Natif SwiftUI + Compose | Officiel, Compose en 0.9.1 | Aucun | Si équipes natives déjà en place |

**Décision : Flutter**, avec le GenUI SDK (renderer A2UI officiel et stable). L'app parle à l'agent par le transport A2A officiel (`genui_a2a`) ; le POC de la phase 1 se fait directement en Flutter.

## 6. Strapi comme chef d'orchestre de l'UI

Un seul catalogue de composants (le design system décrit en JSON Schema ou Zod) sert aux écrans configurés dans Strapi et aux écrans générés par l'agent.

- **Server-Driven UI statique** : content types `Screen` / `Layout` en Dynamic Zones dans Strapi, chaque composant mappé 1:1 sur une entrée du catalogue. Le BFF convertit ces écrans en messages A2UI : le client n'a qu'un renderer, que l'écran vienne de Strapi ou de l'agent.
- **Generative UI** : l'agent est contraint au même catalogue (custom catalog A2UI). Il ne produit rien que le design system ne sache afficher.
- **Feature flipping** : Unleash open source auto-hébergé, découplé de Strapi : une section ne porte qu'un nom de flag, que le BFF évalue (détail dans [02-architecture-detaillee.md](02-architecture-detaillee.md)).
- **Ce que les flags pilotent** : les écrans et sections, les tools proposés au modèle (filtrés par le service agent), l'activation des surfaces agentiques par segment.

## 7. Plan de mise en œuvre

Cinq phases, environ 6 mois avant l'ouverture. L'app headless pilotée par Strapi est en production avant toute IA. Chaque phase livre quelque chose d'utilisable : le risque IA n'arrive qu'une fois le socle headless stable.

> Le plan d'exécution du POC (phases techniques) est dans [`../plan/00-plan.md`](../plan/00-plan.md). Le schéma du plan à 5 phases (Claude Doc) n'a pas été transposé : à reprendre si besoin.

## Points de vigilance

- **Maturité** : A2UI 1.0 a moins de deux semaines, Compose n'est pas encore en 1.0, les Server Cards sont en draft. Cibler A2UI 1.0 sur toutes les briques (compatibilité détaillée dans l'architecture détaillée) et isoler ces dépendances derrière ses propres interfaces.
- **Sécurité Strapi** : l'Admin token MCP est très puissant. Un token par agent, permissions minimales, jamais exposé au front. Tenir Strapi à jour : cinq CVE corrigées en mai 2026, dont deux critiques.
- **Latence et coût** : la generative UI via LLM est lente. Garder le chemin déterministe pour 80 % des écrans, l'agent pour les parcours où il apporte vraiment quelque chose.
- **Écritures** : toute action qui modifie le SI (CRM, publication) passe par une confirmation humaine.

## Sources

- [MCP 2026-07-28 : annonce de la spec](https://blog.modelcontextprotocol.io/posts/2026-07-28/)
- [MCP Apps, extension officielle](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/)
- [MCP Registry : à propos](https://modelcontextprotocol.io/registry/about)
- [SEP-2127 : MCP Server Cards](https://modelcontextprotocol.io/seps/2127-mcp-server-cards)
- [Running a private MCP registry (Scalekit)](https://www.scalekit.com/blog/private-mcp-registry)
- [Kong MCP Registry](https://www.konghq.com/company/press-room/press-release/kong-introduces-mcp-registry)
- [Strapi MCP server (docs)](https://docs.strapi.io/cms/features/strapi-mcp-server)
- [Strapi MCP server GA](https://strapi.io/blog/the-strapi-mcp-server-is-now-ga)
- [A2UI 1.0 (Google Developers Blog)](https://developers.googleblog.com/en/a2ui-1-0-generative-ui)
- [A2UI + MCP Apps](https://developers.googleblog.com/en/a2ui-and-mcp-apps/)
- [A2UI : renderers](https://a2ui.org/reference/renderers/)
- [A2A v1.0 : guide de mise en œuvre (AAIF)](https://aaif.io/blog/a2a-v1-0-a-builder-s-guide-part-1-discovery-tasks-and-clients)
- [agentgateway : FAQ](https://agentgateway.dev/docs/standalone/latest/faqs/)
- [CopilotKit : generative UI](https://github.com/CopilotKit/generative-ui)
- [json-render (Vercel Labs)](https://github.com/vercel-labs/json-render)
