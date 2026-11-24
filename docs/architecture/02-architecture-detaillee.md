# Architecture détaillée

> Transposé depuis le Claude Doc « Architecture omnicanale headless, MCP et generative UI » (onglet *Architecture détaillée*, rév. 36, 24 nov. 2026). Les schémas sont reconstruits en Mermaid dans [diagrammes.md](diagrammes.md).


Stack 100 % open source : Flutter et Next.js en façade, un BFF et un service agent en TypeScript derrière, agentgateway comme point d'entrée unique vers le SI, Strapi pour le contenu, Unleash pour les flags, Keycloak pour l'identité. Strapi et Unleash sont découplés : ils ne se parlent pas, ils se rejoignent seulement dans le BFF.

## Stack retenue

| Couche | Brique | Licence | Rôle |
|---|---|---|---|
| Mobile | Flutter + GenUI SDK (`genui`) | BSD-3 / open source Google | App native, rendu A2UI avec vos widgets |
| Web | Next.js (App Router) + CopilotKit + `@a2ui/react` | MIT | Front web, SSR, chat et rendu A2UI |
| Catalogue UI | Dépôt `design-catalog` (JSON Schema A2UI) | interne | Source unique des composants autorisés, génère types TS et Dart |
| BFF | Node.js / TypeScript (NestJS ou Fastify) | MIT | Écrans SDUI, agrégation, cache, flags côté serveur |
| Service agent | Node.js / TypeScript : Mastra + `@ag-ui/mastra` + SDK A2UI TypeScript | Apache 2.0 (hors dossiers ee/) | Conversation, génération A2UI, appels MCP |
| Gateway | agentgateway | Apache 2.0 | Point d'entrée unique MCP, A2A, LLM et HTTP ; authN/authZ par tool |
| Registre | ToolHive Registry Server (registre seul) | Apache 2.0 | Catalogue des MCP servers, API du registre MCP officiel |
| Identité | Keycloak | Apache 2.0 | OIDC pour les apps, OAuth pour MCP, token exchange |
| CMS | Strapi 5 (≥ 5.49, MCP intégré) | MIT (édition communautaire) | Contenu et composition des écrans |
| Feature flags | Unleash Open Source (v8+) | AGPLv3 | Activation, ciblage, rollout progressif, kill switch |
| Traces LLM | Langfuse | MIT (cœur) | Traces d'agent, coûts, évaluations, datasets |
| Observabilité | OpenTelemetry Collector + Grafana, Tempo, Loki, Prometheus | Apache 2.0 / AGPLv3 | Traces, logs, métriques de bout en bout |
| Plateforme | Kubernetes + Helm + Argo CD | Apache 2.0 | Déploiement GitOps |

Deux licences AGPLv3 (Unleash v8+, une partie de la stack Grafana) : sans impact pour un usage interne auto-hébergé, mais à faire valider par votre juridique si vous modifiez et redistribuez ces briques.

## Schéma d'ensemble

> **[Schéma : architecture détaillée · 4 couches + services transverses]** — voir le diagramme correspondant dans [diagrammes.md](diagrammes.md).

Les apps parlent à deux services seulement : le BFF en REST pour les écrans, le service agent pour la conversation (AG-UI sur le web, A2A sur Flutter). Ces deux services, comme les assistants externes, n'atteignent le SI qu'à travers agentgateway. Keycloak, Unleash, le registre, le catalogue et l'observabilité sont utilisés par toutes les couches.

## Canaux : Flutter et Next.js

Les deux fronts n'ont que deux contrats à respecter : rendre des surfaces A2UI avec le catalogue commun, et parler au service agent par un protocole standard (AG-UI pour le web, A2A pour Flutter). Aucun des deux n'appelle directement Strapi, Unleash (sauf l'API Frontend) ou le SI.

### Catalogue de composants partagé

- **Source unique** : un dépôt `design-catalog` décrit chaque composant autorisé en JSON Schema, au format d'un custom catalog A2UI (nom, props, actions, exemples). Exemples : `ProductCard`, `OfferBanner`, `CustomerSummary`, `OrderTimeline`, `ConfirmAction`, `Form`, `Chart`.
- **Génération** : la CI génère les types TypeScript (React) et Dart (Flutter) ; chaque équipe implémente le composant natif correspondant. Un test de contrat vérifie que les deux plateformes couvrent 100 % du catalogue.
- **Versioning** : le catalogue est versionné (`catalogId` avec version). Le BFF et l'agent n'émettent que des composants supportés par la version déclarée par le client.

### App Flutter

- **Rendu** : package `genui` (SurfaceController + catalogue de vos widgets). Les messages A2UI passés à `SurfaceController.handleMessage()` mettent à jour l'état et le DataModel, puis la surface se redessine.
- **Transport A2A** : le transport officiel `genui_a2a` relie le SurfaceController de `genui` à l'endpoint A2A du service agent, qui renvoie les messages A2UI. Aucun client maison à maintenir : deux protocoles standards (A2A ici, AG-UI sur le web), servis par le même agent.
- **Écrans SDUI** : même renderer, alimenté par le BFF en REST au lieu de l'agent.
- **Flags** : `unleash_proxy_client_flutter` sur l'API Frontend d'Unleash, pour les bascules purement visuelles.
- **Auth** : OIDC Authorization Code + PKCE vers Keycloak (`flutter_appauth`), refresh token en stockage sécurisé.

### Front Next.js

- **Rendu SDUI** : Server Components qui appellent le BFF et rendent la surface A2UI côté serveur (SEO, premier affichage rapide), puis hydratation.
- **Agentique** : CopilotKit (MIT) avec son runtime dans une route `app/api/copilotkit`, connecté en AG-UI au service agent. Rendu A2UI 1.0 avec le renderer officiel `@a2ui/react` et le catalogue généré ; le middleware A2UI intégré à CopilotKit, qui parle 0.9, est désactivé. Les MCP Apps passent par le middleware MCP Apps de CopilotKit.
- **Flags** : `@unleash/nextjs`, évalués côté serveur (pas de clignotement) et dans le middleware pour l'A/B testing de routes.
- **Auth** : OIDC vers Keycloak (Auth.js), session côté serveur, jeton transmis au BFF et au runtime CopilotKit.

### Compatibilité des versions (vérifiée le 24 novembre 2026)

Toutes les briques savent parler A2UI 1.0 et A2A 1.0, à une exception près côté web, contournée par le renderer officiel.

| Brique | A2UI | A2A | À retenir |
|---|---|---|---|
| Service agent (Mastra) | 1.0 via le SDK A2UI TypeScript | v0.3 et v1.0 sur la même Agent Card, choisis par l'en-tête `A2A-Version` | A2A bâti sur le SDK officiel `@a2a-js/sdk` ; cards signées possibles |
| App Flutter (`genui` ≥ 0.10 + `genui_a2a` 0.10.1) | 0.9, 0.9.1 et 1.0 via `a2ui_core` | version non documentée | Sans risque : Mastra sert les deux versions d'A2A |
| Web (CopilotKit) | Middleware intégré en 0.9 | sans objet | Rendu 1.0 par `@a2ui/react` et `@a2ui/web_core` |
| Web (`@a2ui/react`) | 1.0 | sans objet | En 1.0, l'UI arrive comme résultat de tool : le front doit avoir un rendu de tool |

- **Cible** : A2UI 1.0 partout. Repli possible : tout en 0.9, que les trois briques supportent.
- **Ruptures 0.9 vers 1.0 à connaître pour le catalogue** : bindings préfixés (`@path`, `@call`), `theme` retiré de `createSurface`, variantes de titre h1 à h5 supprimées, chaîne de version `"1.0"`.
- **Reste à vérifier au POC** : la version d'A2UI émise par l'intégration `@ag-ui/mastra`, et la version d'A2A parlée par `genui_a2a`.

## Couche d'expérience : BFF et service agent

Deux services distincts, car leurs contraintes s'opposent : le BFF doit être rapide, déterministe et cacheable ; le service agent est lent, non déterministe et coûteux. Les séparer permet de les scaler, de les tester et de les couper indépendamment.

### BFF (TypeScript)

| Endpoint | Rôle |
|---|---|
| `GET /screens/{slug}` | Compose un écran SDUI : layout Strapi + flags Unleash + données métier, renvoyé en messages A2UI |
| `GET /bootstrap` | Configuration de démarrage : version du catalogue, navigation, flags serveur, URL de l'agent |
| `POST /actions/{name}` | Actions déterministes déclenchées par un composant (ajout panier, abonnement newsletter) |
| `POST /webhooks/strapi` | Invalidation du cache à chaque publication Strapi |

- **Composition** : lit l'écran publié dans Strapi (REST ou GraphQL, jeton lecture seule), retire les sections dont le flag est inactif pour ce contexte, résout les sources de données de chaque section, puis traduit le tout en messages A2UI (`createSurface`, `updateComponents`, modèle de données).
- **Données métier** : appels REST classiques vers les APIs du SI, à travers agentgateway en mode HTTP (même politique d'auth, même télémétrie). Pas de MCP ni de LLM sur ce chemin.
- **Cache** : Redis, clé = écran + locale + segment + empreinte des flags. Invalidé par le webhook Strapi et à la modification d'un flag (webhook Unleash ou TTL court).
- **Flags** : SDK Node d'Unleash en évaluation locale (pas d'appel réseau par requête).

### Service agent (TypeScript)

- **Runtime** : Mastra en Node.js / TypeScript (cœur Apache 2.0 ; on n'utilise pas les fonctions des dossiers `ee/`, sous licence Enterprise). Exposé en AG-UI par `@ag-ui/mastra`, qui prend en charge l'UI générée, l'état partagé et les interruptions. Il expose aussi une Agent Card et un endpoint A2A, utilisés par l'app Flutter (package genui_a2a) et par d'autres agents.
- **Génération d'UI** : le SDK A2UI TypeScript (arrivé avec la 1.0) charge le catalogue `design-catalog`, l'enseigne au modèle et valide chaque message A2UI produit ; un message invalide est corrigé ou remplacé par du texte, jamais envoyé tel quel.
- **Outils** : client MCP intégré à Mastra, connecté à un seul endpoint, celui d'agentgateway, avec le jeton de l'utilisateur obtenu par token exchange. L'agent ne connaît ni les URLs ni les secrets des MCP servers.
- **Recherche d'outils** : au-delà d'une trentaine de tools, l'agent ne charge pas toute la liste dans le prompt : il interroge le registre (descriptions, tags) puis ne présente au modèle que les tools pertinents.
- **Filtrage produit** : la liste des tools et surfaces proposés est filtrée par les flags Unleash (SDK Node). C'est de l'exposition produit, pas de la sécurité : la sécurité reste dans la gateway.
- **LLM** : appelé via agentgateway (route LLM), ce qui rend le fournisseur interchangeable, y compris un modèle open-weight auto-hébergé.
- **Mémoire et reprise** : état des conversations et des workflows suspendus (validation humaine) en PostgreSQL.
- **Partage avec le BFF** : un monorepo (Turborepo ou Nx) partage les types générés du catalogue, le client Unleash et la configuration OpenTelemetry.
- **Vigilance** : Mastra évolue très vite (1.83 publiée le 12 novembre 2026) et a subi une attaque de chaîne d'approvisionnement en juin 2026 : versions épinglées, lockfile et scan des dépendances en CI.

## Strapi : contenu et composition des écrans

Strapi décrit quoi afficher et dans quel ordre ; il ne décide ni pour qui (Unleash) ni avec quelles données (SI). Chaque composant Strapi correspond 1:1 à une entrée du catalogue.

### Modèle de contenu

| Type | Champs principaux | Usage |
|---|---|---|
| `screen` (collection) | `slug`, `title`, `channels` (web, mobile), `sections` (Dynamic Zone), `seo` | Un écran composable |
| `sections.*` (composants) | Props du composant du catalogue + `dataSource` + `flagKey` | Une section d'écran : `hero`, `product-carousel`, `offer-banner`, `agent-entry`… |
| `navigation` (single type) | Onglets, menus, deep links | Navigation des deux apps |
| `article`, `offer`, `faq` (collections) | Contenu éditorial classique | Données des sections et base de connaissance de l'agent |

-  : une clé (`catalog.bestsellers`, `crm.customer-summary`) que le BFF résout par un resolver. Strapi ne contient aucune URL ni requête vers le SI.
-  : un simple nom de flag, facultatif. Strapi ne sait pas ce qu'il signifie ; le BFF demande à Unleash si la section est active pour ce contexte. C'est le seul point de contact, et il passe par un nom, pas par une intégration.
-  : section qui ouvre l'agent avec des suggestions de questions éditables par le marketing.
- **i18n et Draft & Publish** : natifs. La prévisualisation passe par le BFF (`status=draft`) et le Draft Mode de Next.js ; côté mobile, une build interne lit les brouillons.

### Strapi côté MCP

- **Lecture par l'agent** : l'agent lit le contenu via le MCP intégré (≥ 5.47, GA en 5.49), derrière agentgateway, avec un Admin token dédié en lecture seule. Ce token est porté par la gateway (backend auth), jamais par l'agent.
- **Écriture** : un second token, limité aux types éditoriaux, réservé à un agent éditorial interne, avec validation humaine systématique avant publication.
- **Outils métier** : des tools sur mesure (« créer un brouillon d'offre à partir d'un brief ») via un plugin qui utilise le service `strapi.ai.mcp`.
- **Audit** : les journaux d'audit MCP de Strapi sont réservés à l'édition Enterprise. En édition communautaire, l'audit se fait dans agentgateway (logs d'accès avec l'identité de l'utilisateur et le tool appelé).

## Unleash : feature flipping découplé

Unleash décide pour qui une fonctionnalité est active ; il ignore tout du contenu. On déploie Unleash Open Source auto-hébergé (PostgreSQL), sans Unleash Edge.

- **Pourquoi pas Edge** : l'édition open source d'Unleash Edge est en fin de vie au 31 décembre 2026. Les apps se branchent donc directement sur l'API Frontend du serveur Unleash (jetons frontend), mise à l'échelle par réplicas.
- **Évaluation côté serveur** : le BFF (SDK Node) et le service agent (SDK Node) téléchargent la configuration et évaluent localement, sans appel réseau par requête.
- **Évaluation côté client** : Flutter (`unleash_proxy_client_flutter`) et Next.js (`@unleash/nextjs`) reçoivent uniquement les résultats, jamais les règles de ciblage.
- **Contexte commun** : `userId`, `sessionId`, `environment` + propriétés `channel` (web, mobile), `appVersion`, `segment`, `country`. Le même contexte partout garantit qu'un utilisateur voit la même chose sur chaque canal.

### Ce que les flags pilotent

| Famille | Exemple de nom | Évalué par | Effet |
|---|---|---|---|
| Sections d'écran | `screen.home.offer-banner` | BFF | Section Strapi affichée ou retirée |
| Fonctionnalité d'app | `app.new-checkout` | Flutter, Next.js | Parcours natif activé |
| Surfaces agentiques | `agent.enabled`, `agent.genui` | BFF, service agent | Agent visible ; UI générée ou texte seul |
| Exposition des tools | `agent.tool.crm-write` | Service agent | Tool proposé au modèle ou non |
| Catalogue UI | `catalog.v2` | BFF, service agent | Version de catalogue émise |
| Modèle LLM | `agent.model.v2` (variants) | Service agent | A/B test entre deux modèles ou prompts |

- **Kill switch** : `agent.enabled` coupe toute la couche agentique en quelques secondes, sans déploiement ; le BFF masque alors les sections `agent-entry`.
- **Rollout** : stratégie de déploiement progressif (1 %, 10 %, 50 %, 100 %) avec contraintes sur `segment` et `appVersion` (indispensable sur mobile, où les vieilles versions restent installées).
- **Hygiène** : tout flag a un propriétaire et une date de retrait ; les flags de release sont supprimés après 100 %.

## agentgateway, registre et identité

Tout appel vers le SI, qu'il vienne du BFF, de l'agent ou d'un assistant externe, traverse agentgateway avec un jeton Keycloak. La gateway authentifie, autorise tool par tool, injecte les secrets des backends et trace.

### Routes d'agentgateway

| Route | Trafic | Appelants | Backends |
|---|---|---|---|
| `/mcp` | MCP fédéré (un seul endpoint) | Service agent, assistants externes | MCP CRM, Strapi, commerce, OpenAPI convertis |
| `/a2a/{agent}` | A2A | Service agent | Agents métier |
| `/llm/v1` | Inférence LLM | Service agent | Fournisseur(s) LLM ou modèle auto-hébergé |
| `/api/{domaine}` | HTTP / REST | BFF | APIs métier du SI |

- **Fédération MCP** : la gateway interroge chaque backend et préfixe les noms de tools par le nom du backend (`crm_search_customer`). L'agent voit un seul serveur.
- **OpenAPI vers MCP** : une API REST documentée devient un ensemble de tools sans écrire de MCP server. Utile pour démarrer vite, à remplacer par des tools conçus à la main sur les parcours clés.
- **Authentification** : validation des JWT Keycloak (JWKS) sur chaque requête, selon la spécification d'autorisation MCP.
- **Autorisation** : règles CEL par tool, sur les rôles et scopes du jeton. Exemple : les tools d'écriture CRM exigent le scope `crm.write` et le rôle `sales`.
- **Secrets des backends** : l'Admin token Strapi et les clés des APIs sont injectés par la gateway (backend auth) ; ni l'agent ni le BFF ne les détiennent.
- **MCP Apps** : la gateway sert les ressources UI des MCP Apps, y compris à travers la fédération.
- **Garde-fous** : rate limiting par utilisateur, filtrage des appels via autorisation externe MCP, logs d'accès avec l'identité et le tool appelé, télémétrie OpenTelemetry.
- **Mode de déploiement** : sur Kubernetes (Gateway API). Point à vérifier au POC : certaines politiques MCP (autorisation par tool) arrivent dans le mode standalone avant les ressources Kubernetes. Suivre les avis de sécurité du projet (CVE-2026-29791 publiée cette année).

### Registre

- **Outil** : le Registry Server de ToolHive (Apache 2.0), déployé seul. Il implémente l'API du registre MCP officiel, signe les entrées et vérifie leur provenance. Le reste de ToolHive (runtime, gateway) n'est pas utilisé : le projet est pré-1.0 et a publié plus de 40 avis de sécurité en septembre et octobre 2026, donc réseau interne uniquement.
- **Contenu** : un `server.json` par MCP server (format du registre officiel) et une Agent Card par agent A2A, versionnés dans Git.
- **Rôle** : catalogue et gouvernance (qui possède quoi, quel statut), métadonnées pour la recherche d'outils de l'agent, source de génération de la configuration d'agentgateway, découverte depuis les IDE.
- **Distinction clé** : la découverte à l'exécution, c'est `tools/list` via la gateway (filtré par identité) ; le registre, c'est le catalogue de ce qui existe.

### Identité (Keycloak)

| Client Keycloak | Type | Usage |
|---|---|---|
| `mobile-app` | Public, PKCE | Connexion des utilisateurs Flutter |
| `web-app` | Confidentiel | Connexion Next.js (Auth.js) |
| `bff` | Confidentiel | Valide les jetons, appelle la gateway pour l'utilisateur |
| `agent-service` | Confidentiel, token exchange autorisé | Échange le jeton utilisateur contre un jeton d'audience `agentgateway` |
| `agentgateway` | Resource server | Audience des jetons acceptés par la gateway |

- **Propagation de l'identité** : le service agent échange le jeton de l'utilisateur (token exchange) contre un jeton à audience restreinte et scopes réduits. Chaque appel de tool porte donc l'identité réelle de l'utilisateur, ce qui rend l'autorisation et l'audit exacts.
- **Conformité MCP de Keycloak** : Keycloak 26.8 (sorti le 1er octobre 2026) ajoute les Resource Indicators RFC 8707 en expérimental, la pièce qui manquait à la 26.7 pour la spec 2026-07-28. Cible : 26.8.1 ou plus, qui corrige plusieurs CVE. Sans impact pour vos clients internes (audience fixée par mapper), à suivre avant d'ouvrir le `/mcp` à des assistants externes (Client ID Metadata Document, encore expérimental).

### Alternatives à Keycloak évaluées

| Fournisseur open source | Enregistrement dynamique (RFC 7591) | Resource Indicators (RFC 8707) | Verdict |
|---|---|---|---|
| Keycloak 26.8 | Oui | Oui, expérimental (+ CIMD) | Retenu : le plus complet, avec le token exchange dont l'agent a besoin |
| Logto | CIMD | Oui, via les API resources (jetons à audience liée) | Meilleure alternative, très orientée MCP |
| Casdoor | Oui | Oui, selon sa documentation | À évaluer, moins répandu en entreprise |
| Ory Hydra | Oui, désactivé par défaut | Non | Écarté |
| Zitadel | Non | Non | Écarté |
| authentik | Non | Non | Écarté |

RFC 8707 ne compte que pour les clients MCP externes : en interne, l'audience des jetons est déjà fixée par le token exchange et les mappers Keycloak.

## MCP servers du SI

Un MCP server par domaine métier, sans état (spec 2026-07-28), déployé comme un microservice derrière agentgateway, et possédé par l'équipe du domaine.

| Domaine | Implémentation | Exemples de tools | Écriture |
|---|---|---|---|
| Contenu | Strapi, MCP intégré | lister et lire les offres, FAQ, articles | Agent éditorial seulement |
| Client (CRM) | MCP server dédié (SDK TypeScript) | `search_customer`, `get_customer_summary`, `create_opportunity` | Oui, avec validation |
| Commerce | OpenAPI vers MCP au départ, puis MCP dédié | `search_products`, `get_order_status`, `create_cart` | Panier oui, commande non |
| ERP, stocks | OpenAPI vers MCP | `get_stock`, `get_delivery_eta` | Non |
| Agents métier | A2A (ex. agent SAV, agent devis) | tâches déléguées, longues | Selon l'agent |

### Règles de conception des tools

- **Par cas d'usage, pas par table** : `get_customer_summary` renvoie ce dont l'agent a besoin en un appel, au lieu de cinq lectures CRUD.
- **Lecture et écriture séparées** : les tools d'écriture sont marqués comme tels (annotations MCP) ; la gateway leur applique des règles plus strictes et l'agent les fait toujours valider.
- **Descriptions soignées** : la description d'un tool est un prompt ; elle dit quand l'utiliser, quand ne pas l'utiliser, et le format de sortie.
- **Sorties structurées** : JSON typé (schema de sortie), paginé et borné en taille, pour maîtriser le coût en tokens.
- **Idempotence** : chaque écriture accepte une clé d'idempotence, car un agent peut réessayer.
- **MCP Apps en option** : un MCP server peut fournir une UI (fiche client, suivi de commande) pour les assistants externes ; vos apps utilisent plutôt A2UI et le catalogue.

## Workflows

Quatre parcours couvrent l'essentiel : un écran sans IA, une conversation qui produit de l'UI, une écriture validée, et l'arrivée d'un nouveau service. Flèche pleine = requête, pointillée = réponse, petit rectangle = traitement interne.

### 1. Afficher un écran (sans LLM)

> **[Schéma : workflow 1 · affichage d'un écran SDUI]** — voir le diagramme correspondant dans [diagrammes.md](diagrammes.md).

- **1.** L'app (Flutter ou Next.js) demande l'écran `home` au BFF avec son jeton, sa locale et la version de catalogue qu'elle sait afficher.
- **2-3.** Le BFF lit l'écran publié dans Strapi, ou le reprend du cache Redis.
- **4.** Il évalue localement les flags Unleash des sections (`flagKey`) et retire celles qui sont inactives pour ce contexte.
- **5-8.** Pour chaque `dataSource`, il appelle l'API métier via la route `/api` d'agentgateway, qui vérifie le jeton et injecte le secret du backend.
- **9.** Il traduit layout et données en messages A2UI conformes au catalogue.
- **10-11.** L'app rend la surface avec ses composants natifs. Aucun LLM sur ce chemin.

### 2. Conversation avec UI générée

> **[Schéma : workflow 2 · conversation avec UI générée]** — voir le diagramme correspondant dans [diagrammes.md](diagrammes.md).

- **1.** L'utilisateur écrit dans le chat ; l'app envoie la requête au service agent (AG-UI sur le web, A2A sur Flutter) (message, jeton, version du catalogue).
- **2-3.** L'agent échange le jeton utilisateur auprès de Keycloak contre un jeton d'audience `agentgateway` aux scopes réduits.
- **4-5.** Il demande la liste des tools à la gateway, qui ne renvoie que ceux autorisés pour cet utilisateur ; l'agent retire ceux dont le flag d'exposition est coupé.
- **6-7.** Il appelle le modèle via la route `/llm` de la gateway, avec la conversation, les tools et le catalogue A2UI ; le modèle demande `crm_get_customer_summary`.
- **8-10.** L'appel traverse la gateway (règle CEL, audit) jusqu'au MCP CRM, qui renvoie un résumé structuré.
- **11.** `a2ui-agent-sdk` produit la surface `CustomerSummary` et la valide contre le catalogue.
- **12.** L'agent streame sa réponse (événements AG-UI ou messages A2A, qui portent le texte et les messages A2UI) ; l'app affiche la carte au fil de l'eau. Un clic sur la carte renvoie une action à l'agent par le même protocole.

### 3. Écriture avec validation humaine

> **[Schéma : workflow 3 · écriture avec validation humaine]** — voir le diagramme correspondant dans [diagrammes.md](diagrammes.md).

- **1.** Le modèle propose `crm_create_opportunity` ; le workflow Mastra se suspend et enregistre son état dans PostgreSQL.
- **2.** L'agent envoie une surface `ConfirmAction` qui récapitule l'opération (client, montant, échéance).
- **3.** L'utilisateur confirme ou corrige ; l'action revient à l'agent et le workflow reprend, même plusieurs heures plus tard.
- **4.** L'agent appelle le tool avec une clé d'idempotence.
- **5.** La gateway vérifie le scope `crm.write` et le rôle `sales` (CEL), puis journalise l'appel avec l'identité de l'utilisateur.
- **6-8.** Le MCP CRM crée l'opportunité et renvoie son identifiant.
- **9.** L'agent met à jour la surface (succès, lien vers la fiche). Sans confirmation, rien n'est écrit.

### 4. Ajouter un service au SI

1. L'équipe du domaine écrit son MCP server (ou fournit un OpenAPI) et son `server.json` dans son dépôt.
2. La CI teste les tools (contrats, évaluations d'usage par l'agent), scanne l'image et signe l'artefact.
3. La fusion publie l'entrée dans le registre, en statut `preview`.
4. Le dépôt `platform` génère la configuration d'agentgateway : nouvelle cible dans la fédération `/mcp`, secret du backend, règles CEL par tool.
5. Un flag Unleash `agent.tool.<nom>` est créé, désactivé.
6. Argo CD déploie ; le flag est ouvert progressivement (équipe interne, 10 %, 100 %) en surveillant Langfuse.
7. Le registre passe l'entrée en `active` : le service devient découvrable par les IDE et les autres agents.

## Observabilité, sécurité et déploiement

Une seule trace OpenTelemetry suit une requête de l'app jusqu'au MCP server ; Langfuse ajoute la vue « agent » (prompts, tokens, coûts, qualité).

### Observabilité

- **Propagation** : le `traceparent` W3C part de l'app, traverse BFF ou service agent, agentgateway et MCP servers. Collecte par un OpenTelemetry Collector.
- **Infra et applicatif** : Tempo (traces), Loki (logs), Prometheus (métriques), Grafana (tableaux de bord).
- **Agent** : Langfuse (cœur MIT, ingestion OpenTelemetry native) reçoit les spans LLM et tools : coût par conversation, latence par étape, taux de messages A2UI invalides, taux d'abandon des validations.
- **Évaluations** : jeux de conversations de référence dans Langfuse, rejoués en CI à chaque changement de prompt, de modèle ou de catalogue.

### Sécurité

- **Moindre privilège** : jetons à audience et scopes restreints, un token par backend dans la gateway, aucun secret dans les apps ni dans l'agent.
- **Injection de prompt** : le contenu renvoyé par un tool est traité comme une donnée ; toute écriture passe par une validation humaine affichée en A2UI (`ConfirmAction`).
- **UI générée** : A2UI est déclaratif (pas de code exécuté) et validé contre le catalogue ; les MCP Apps tournent en iframe sandboxée.
- **Données personnelles** : masquage des PII dans les traces Langfuse, rétention limitée, choix d'un fournisseur LLM compatible RGPD ou modèle auto-hébergé.

### Déploiement

- **Plateforme** : Kubernetes, un namespace par couche (`channels`, `experience`, `gateway`, `domain`, `platform`), Helm et Argo CD en GitOps.
- **Bases** : PostgreSQL pour Strapi, Unleash, Keycloak, état des workflows Mastra et Langfuse ; Redis pour le cache du BFF ; ClickHouse et stockage objet S3-compatible pour Langfuse.
- **Dépôts** : `design-catalog`, `app-flutter`, `web-next`, `bff`, `agent-service`, `mcp-*` (un par domaine), `platform` (Helm, configuration agentgateway générée, `server.json`).
- **Mobile** : publication via les stores ; le catalogue versionné et les flags sur `appVersion` évitent d'envoyer un composant qu'une vieille version ne sait pas afficher.

## Points à trancher

- Langage du service agent : décidé, TypeScript partout, avec Mastra pour l'agent. Reste à valider au POC la maturité du SDK A2UI TypeScript, sorti avec la 1.0.
- Transport Flutter : décidé, transport A2A officiel (`genui_a2a`), standard et maintenu côté Flutter ; le service agent expose une Agent Card et un endpoint A2A.
- Fournisseur LLM : API hébergée ou modèle open-weight auto-hébergé, selon les contraintes RGPD et de coût.
- Ouverture du `/mcp` aux assistants externes (Claude, ChatGPT) : possible avec Keycloak 26.8, où RFC 8707 est encore expérimental : à tester au POC avec Claude ou ChatGPT avant toute ouverture.

## Sources

- [agentgateway : introduction et fonctionnalités](https://agentgateway.dev/docs/about/introduction)
- [agentgateway : MCP (auth, autorisation, MCP Apps)](https://agentgateway.dev/docs/standalone/latest/mcp/)
- [Revue d'agentgateway open source (fédération, OpenAPI)](https://dev.to/spacewander/agentgateway-review-a-feature-rich-new-ai-gateway-53lm)
- [Gouvernance MCP avec agentgateway (AAIF)](https://aaif.io/blog/building-a-governed-mcp-platform-with-agentgateway)
- [Sécurité MCP avec agentgateway (AAIF)](https://aaif.io/blog/enterprise-mcp-gateway-security-in-practice-with-agentgateway)
- [Keycloak comme serveur d'autorisation MCP](https://www.keycloak.org/securing-apps/mcp-authz-server)
- [Keycloak et la spec MCP 2026-07-28 (AAIF)](https://aaif.io/blog/using-keycloak-as-an-mcp-authorization-server)
- [Unleash : SDK Flutter](https://docs.getunleash.io/sdks/flutter)
- [Unleash : SDK Next.js](https://www.npmjs.com/package/@unleash/nextjs)
- [Unleash : disponibilité et licences](https://docs.getunleash.io/support/availability)
- [Unleash Edge open source : fin de vie](https://docs.getunleash.io/release-notes/2025/12/12)
- [GenUI SDK for Flutter : composants](https://docs.flutter.dev/ai/genui/components.html)
- [gen](https://pub.dev/documentation/genui_a2a/latest/)[ui_a2a (transport A2A pour GenUI](https://pub.dev/documentation/genui_a2a/latest/)[)](https://pub.dev/documentation/genui_a2a/latest/)
- [A2UI 1.0](https://developers.googleblog.com/en/a2ui-1-0-generative-ui)
- [CopilotKit (licence MIT)](https://github.com/CopilotKit/CopilotKit)
- [CopilotKit : renderer A2UI](https://app.unpkg.com/@copilotkit/a2ui-renderer@1.70.1/files/skills/a2ui-renderer/SKILL.md)
- [Mastra compatible AG-UI (CopilotKit)](https://www.copilotkit.ai/blog/mastra-agui-compatible) · [Mastra : licence et versions](https://www.developersdigest.tech/agent-frameworks/mastra)
- [ToolHive (Help Net Security)](https://www.helpnetsecurity.com/2026/09/07/toolhive-open-source-mcp-server-security/)
- [Revue de ToolHive (Geekflare)](https://geekflare.com/open-source/toolhive/)
- [Strapi : MCP server](https://docs.strapi.io/cms/features/strapi-mcp-server)
- [Strapi MCP server (fiche détaillée)](https://www.developersdigest.tech/mcp-servers/strapi)
- [Langfuse](https://langfuse.com/)

Ajoutées lors de la vérification du 24 novembre 2026 :

- [Mastra : A2A (v0.3 et v1.0)](https://mastra.ai/docs/connections/a2a)
- [Mastra : A2A sur @a2a-js/sdk](https://mastra.ai/blog/what-is-agent-to-agent-protocol)
- [a2ui_core (Dart) : versions d'A2UI supportées](https://pub.dev/packages/a2ui_core)
- [genui 0.10 : changelog](https://pub.dev/packages/genui/versions/0.10.0/changelog)
- [Ce qui change avec A2UI 1.0 (versions et renderers)](https://dev.to/gde/what-changes-with-the-a2ui-10-release-31eo)
- [Keycloak 26.8.0](https://www.keycloak.org/2026/10/keycloak-2680-released)
- [Keycloak 26.8.1 (correctifs de sécurité)](https://www.keycloak.org/2026/10/keycloak-2681-released)
- [Fournisseurs d'identité et MCP (Zuplo)](https://zuplo.com/learn/mcp/compatibility/identity-providers)
- [Logto : auth pour serveurs MCP](https://docs.logto.io/use-cases/ai/mcp-server-add-auth)
- [Casdoor comme fournisseur d'auth MCP](https://casdoor.org/docs/mcp-auth/overview)

