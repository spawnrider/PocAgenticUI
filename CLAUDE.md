# CLAUDE.md — ProtoAgenticUI

POC omnicanal headless, 100 % TypeScript côté serveur, standards ouverts. Le squelette existe mais **n'a jamais été exécuté** : traite tout le code actuel comme un brouillon à valider.

## Lire d'abord
0. `docs/architecture/README.md` — le « pourquoi » (doc d'architecture transposée du Claude Doc).
1. `docs/specs/00-architecture.md` — composants, flux, décisions figées.
2. `docs/specs/01-contrats.md` — contrats entre composants (A2UI, MCP, auth, flags).
3. `docs/plan/00-plan.md` — phases ordonnées, critères d'acceptation, commandes de vérification.

## Règles de travail
- **Le dépôt est la source documentaire** : toute décision d'architecture mise à jour va dans `docs/architecture/` (et `docs/specs/` si un contrat change), dans le même commit que le code.
- Avance **phase par phase**, dans l'ordre. Ne passe à la suivante que si les critères d'acceptation sont verts.
- **Vérifie avant de coder** : pour toute lib marquée « À VÉRIFIER » (Mastra, @ag-ui/mastra, @a2ui/react, genui, agentgateway), lis la doc/les types installés (`node_modules/*/dist/*.d.ts`, `dart pub deps`) plutôt que de deviner une API. Si la réalité diffère des specs, corrige le code **et** mets à jour la spec dans le même commit.
- Épingle chaque dépendance `latest` à la version réellement installée (lockfile commité).
- Pas de secrets en dur hors valeurs de dev du `.env.example`.
- Évite les dossiers `ee/` de Mastra (licence). Licences : tout reste OSS.
- Une écriture (outil MCP mutateur) passe **toujours** par la surface `ConfirmAction`.
- Petits commits, un par tâche du plan, message au format `phase-N: sujet`.

## Définition de « fini » d'une tâche
Commande de vérification du plan exécutée avec succès + note dans `docs/plan/STATUS.md` (créer/mettre à jour : tâche, date, résultat, écarts constatés).

## Commandes utiles
- Démarrer l'infra : `docker compose up -d --build`
- Logs : `docker compose logs -f <service>`
- Typecheck TS : `npx tsc --noEmit -p <service>`
- Flutter : `cd apps/mobile && flutter pub get && flutter analyze`
