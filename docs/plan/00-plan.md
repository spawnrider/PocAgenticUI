# Plan d'implémentation (pour Claude Code)

Chaque phase : objectif → tâches → **critères d'acceptation** → vérification. Mettre à jour `docs/plan/STATUS.md` à chaque tâche.
Légende : 🔎 vérifier la doc/les types réels avant de coder.

## Phase 0 — Mise en route (1/2 j)
- T0.1 `npm install` à la racine ; corriger les `package.json` (workspaces, scripts) jusqu'à ce que `npm ls` soit sans erreur.
- T0.2 Ajouter `tsconfig.json` aux services TS ; `npx tsc --noEmit` doit passer partout.
- T0.3 Épingler toutes les versions `latest` ; commiter le lockfile.
- T0.4 Initialiser git, premier commit.
**Accept.** : install propre, typecheck vert. **Vérif.** : `npm install && for d in services/* apps/web; do npx tsc --noEmit -p $d; done`

## Phase 1 — Plateforme (1 j)
- T1.1 `docker compose up -d postgres redis keycloak unleash` : tous « healthy ». Corriger l'image/tag Keycloak, l'import du realm, l'init des bases.
- T1.2 Générer le projet Strapi (`create-strapi`), y intégrer les types de `services/strapi/src`, démarrer, créer un token API lecture seule, créer l'écran `home` avec une section `banner` (flagKey `screen.home.offer-banner`).
- T1.3 Dans Unleash, créer les flags `screen.home.offer-banner`, `agent.enabled`.
- T1.4 Générer les types TS/Dart depuis `catalog.schema.json`.
**Accept.** : Keycloak répond sur `:8081/realms/poc/.well-known/openid-configuration` ; Strapi `GET /api/screens` avec token → 200 ; Unleash UI joignable.

## Phase 2 — Serveur MCP + gateway (1 j)
- T2.1 🔎 Lancer `mcp-crm` seul, tester avec `npx @modelcontextprotocol/inspector` (liste des outils, appel `crm_get_customer`).
- T2.2 🔎 Valider `infra/agentgateway/config.yaml` contre la doc de l'image utilisée ; faire fonctionner : sans jeton → 401 ; avec jeton alice → `tools/list`.
- T2.3 Obtenir un jeton Keycloak (password grant en dev) à audience `agentgateway` (ajouter un mapper d'audience si besoin).
- T2.4 Règle CEL : `crm_update_email` refusé sans rôle `crm-writer` (tester avec un 2ᵉ utilisateur `bob` sans ce rôle ; l'ajouter au realm).
**Accept.** : script `scripts/e2e-mcp.sh` (à écrire) vérifie 401 sans jeton, lecture OK, écriture refusée pour bob, OK pour alice.

## Phase 3 — BFF / SDUI (1 j)
- T3.1 BFF démarre, `/healthz` OK, `/screens/home` renvoie des messages A2UI valides (écrire un test Vitest sur `toA2ui`).
- T3.2 🔎 Corriger le `populate` Strapi pour obtenir les sections.
- T3.3 Filtrage par flag : désactiver `screen.home.offer-banner` → section absente ; cache non dépendant de l'utilisateur.
- T3.4 Valider les messages contre le schéma A2UI 1.0 (validateur officiel si dispo).
**Accept.** : tests unitaires verts + 2 appels `curl` (flag on/off) donnant des réponses différentes.

## Phase 4 — Agent (2 j) — phase la plus risquée
- T4.1 🔎 Lire la doc Mastra installée : structure `Mastra`, serveur HTTP, exposition AG-UI (`@ag-ui/mastra`) et A2A. Réécrire `services/agent/src/index.ts` en conséquence (aujourd'hui incomplet).
- T4.2 Construire l'agent **par requête** avec le jeton de l'utilisateur (pas de jeton de service) ; implémenter le token exchange (client `agent-service`).
- T4.3 🔎 Vérifier quelle version d'A2UI l'agent émet ; si ≠ 1.0, ajouter un adaptateur ou émettre les surfaces via l'outil (`show_confirm_action` et un outil `show_customer_card`).
- T4.4 Workflow d'écriture : suspend/resume Mastra (stockage Postgres) ; l'écriture ne part qu'après `confirm=true`.
- T4.5 Flag `agent.enabled` et `agent.tool.<nom>` : filtrer l'agent/les outils exposés.
**Accept.** : test d'intégration (script) : « montre le client c1 » → appel `crm_get_customer` + surface `CustomerCard` ; « change son email » → surface `ConfirmAction`, **aucun** appel `crm_update_email` avant confirmation ; après confirmation → appel effectué.

## Phase 5 — Web Next.js (1,5 j)
- T5.1 Auth.js + Keycloak (PKCE), jeton transmis à l'agent.
- T5.2 🔎 Rendu A2UI : API réelle de `@a2ui/react` (1.0 ou 0.x), adapter `page.tsx`. Implémenter les composants du catalogue (`Banner`, `CustomerCard`, `ConfirmAction`, `Text`).
- T5.3 CopilotKit ↔ agent via AG-UI ; middleware A2UI intégré désactivé ; surfaces de l'agent rendues dans le chat.
- T5.4 Boutons de `ConfirmAction` renvoient la décision à l'agent.
**Accept.** : parcours manuel complet dans le navigateur + test Playwright du parcours confirmation.

## Phase 6 — Flutter (2 j)
- T6.1 `flutter create` pour générer les dossiers plateformes (le dépôt n'a que `lib/` et `pubspec.yaml`) ; `flutter pub get`, `flutter analyze` vert.
- T6.2 flutter_appauth : connexion Keycloak (PKCE, redirect `com.example.protoagenticui:/oauthredirect`).
- T6.3 🔎 genui 0.10 : lire l'API réelle (SurfaceController, transport A2A) ; connecter à l'Agent Card de l'agent ; vérifier la version A2A (0.3 vs 1.0).
- T6.4 Implémenter le catalogue Flutter (mêmes 4 composants) ; écran d'accueil via BFF.
- T6.5 Parcours chat + confirmation, identique au web.
**Accept.** : sur simulateur, parcours complet ; `flutter analyze` et `flutter test` verts.

## Phase 7 — Finitions (1 j)
- Registre : remplacer le stub par ToolHive Registry Server (`server.json`), l'agent découvre le CRM via le registre.
- Optionnel : Langfuse (traces agent), OTel.
- README à jour (retirer les « non vérifié » résolus), script `make up`/`make e2e`.
**Accept.** : `docker compose up` sur machine neuve + README suffisent à rejouer la démo.

## Estimation
≈ 10 jours-homme pour un développeur seul ; l'agent et genui concentrent l'incertitude.

## Risques connus
1. API Mastra/`@ag-ui/mastra` instable (versions épinglées, lire les `.d.ts`).
2. Écart de version A2UI/A2A entre Mastra, CopilotKit et genui.
3. Champs agentgateway standalone possiblement différents de la config écrite.
4. `@a2ui/react` : docs vues en 0.x, cible 1.0.
