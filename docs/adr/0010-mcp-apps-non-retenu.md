# ADR 0010 — MCP Apps non retenu pour l'UI

**Statut :** Acceptée

## Contexte
MCP Apps permet à un outil MCP de fournir une UI HTML (ressource `ui://`) rendue dans une iframe sandboxée par l'hôte. AG-UI et MCP Apps ne sont pas concurrents : l'un est un transport agent ↔ application, l'autre un format d'UI embarquée dans MCP.

## Décision
Ne pas utiliser MCP Apps. L'UI est décrite en A2UI et rendue avec le catalogue natif de chaque client, ce qui garantit cohérence avec le design system et rendu natif sur Flutter.

## Conséquences
- Les serveurs MCP restent sans UI ; l'agent expose les composants via ses outils d'UI.
- MCP Apps pourra être ajouté pour des serveurs tiers, via un affichage iframe dans le web uniquement. Détails de la spec à re-vérifier alors.
