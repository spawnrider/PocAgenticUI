# ADR 0004 — Agent Mastra servi par un Express maison, construit par requête

**Statut :** Acceptée

## Contexte
L'agent doit appeler les outils MCP avec l'identité de l'utilisateur courant. `mastra dev` impose une instance partagée.

## Décision
Mastra (`Agent`, `createTool`, `MCPClient`) est exposé via `MastraAgent` (`@ag-ui/mastra`) dans un serveur Express (`services/agent/src/server.ts`). L'agent et son `MCPClient` sont construits **à chaque requête** avec le jeton échangé de l'utilisateur.

## Conséquences
- Pas de fuite d'identité entre utilisateurs.
- Coût de construction par requête (acceptable pour un POC).
- `mastra dev` n'est pas utilisé.
