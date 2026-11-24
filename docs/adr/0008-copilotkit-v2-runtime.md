# ADR 0008 — CopilotKit : runtime v2 et `useRenderTool`

**Statut :** Acceptée

## Contexte
Avec CopilotKit 1.90.2, l'endpoint GraphQL v1 et `useRenderToolCall` ne fonctionnent pas avec le client v1.90 (`/info` en 404/405, rendu absent).

## Décision
Utiliser `createCopilotRuntimeHandler` de `@copilotkit/runtime/v2` dans une route catch-all Next.js, et `useRenderTool` de `@copilotkit/react-core/v2`. `maplibre-gl` est requis. Le composant A2UI est chargé avec `next/dynamic` (`ssr: false`).

## Conséquences
- Dépendance à l'API v2 de CopilotKit, à re-vérifier lors des montées de version.
