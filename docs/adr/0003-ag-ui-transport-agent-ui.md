# ADR 0003 — AG-UI comme transport agent ↔ UI

**Statut :** Acceptée

## Contexte
Il faut un flux temps réel entre l'agent et les clients (texte, appels d'outils, rendu d'UI), identique pour web et Flutter.

## Décision
Utiliser AG-UI (protocole ouvert, SSE) : le web passe par CopilotKit, Flutter appelle directement `POST /ag-ui/assistant` avec son jeton Keycloak. A2A, initialement prévu pour Flutter, n'est pas implémenté.

## Conséquences
- Un seul endpoint agent pour tous les canaux.
- AG-UI transporte l'échange ; A2UI décrit l'UI. Ce sont deux couches distinctes.
