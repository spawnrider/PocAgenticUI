# ADR 0001 — TypeScript côté serveur, standards ouverts

**Statut :** Acceptée

## Contexte
Le POC doit rester lisible et reproductible par une petite équipe, sans dépendance propriétaire.

## Décision
Tous les services serveur sont en TypeScript (Node, Express). Le web est en Next.js, le mobile en Flutter. On privilégie les protocoles ouverts (MCP, AG-UI, A2UI, OIDC) et des briques OSS ; les dossiers `ee/` de Mastra sont évités.

## Conséquences
- Un seul langage, un workspace npm, un `tsconfig.base.json` partagé.
- Le mobile (Dart) ne partage pas de code avec le serveur ; les types ne sont pas générés (voir `STATUS.md`).
