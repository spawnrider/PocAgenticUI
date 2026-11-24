# ADR 0002 — A2UI v0.9 avec catalogue custom

**Statut :** Acceptée

## Contexte
Les specs visaient A2UI 1.0. Vérification faite, `@a2ui/react` 0.15.0 ne parle que v0.9 (et v0.8 legacy) ; aucune 1.0 n'est publiée. Le middleware A2UI intégré de CopilotKit n'est pas adapté à nos besoins.

## Décision
Utiliser A2UI **v0.9** de bout en bout (`createSurface`, `updateComponents`, catalogue `poc/design-catalog/v1`). Le rendu web passe par `@a2ui/react/v0_9` avec un catalogue custom (Column, Text, Banner, CustomerCard, ConfirmAction).

## Conséquences
- Le format est déclaratif : le même message peut être rendu en natif sur web et Flutter.
- Migration à prévoir quand une 1.0 existera. Pas de validateur officiel utilisé pour l'instant.
