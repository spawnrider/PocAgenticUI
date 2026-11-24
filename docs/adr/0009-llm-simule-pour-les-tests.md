# ADR 0009 — LLM simulé pour les tests

**Statut :** Acceptée

## Contexte
Les tests de bout en bout ne doivent pas dépendre d'une clé API ni d'un modèle non déterministe.

## Décision
`AGENT_MODEL=mock` active un faux LLM scripté (`services/agent/src/mock-model.ts`). Un vrai modèle s'active avec `ANTHROPIC_API_KEY` et `AGENT_MODEL=anthropic/...`.

## Conséquences
- Tests reproductibles et gratuits (`make e2e`).
- Le comportement avec un vrai LLM n'est pas encore vérifié.
