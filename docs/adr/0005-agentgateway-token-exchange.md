# ADR 0005 — agentgateway + Keycloak token exchange pour l'accès MCP

**Statut :** Acceptée

## Contexte
Les serveurs MCP ne doivent pas être joignables directement, et l'autorisation doit se faire par outil et par rôle.

## Décision
Le client obtient un jeton Keycloak (PKCE, audience `agent-service`). L'agent le vérifie (jose), puis l'échange (standard token exchange) contre un jeton d'audience `agentgateway`. agentgateway valide le JWT et applique des règles CEL : `crm_update_email` exige le rôle `crm-writer`.

## Conséquences
- Prérequis Keycloak : l'utilisateur doit porter le rôle client `agentgateway:access`, sinon l'audience n'est pas accordée.
- Après réimport du realm, redémarrer agentgateway et l'agent (cache JWKS).
- Utilisateurs de dev : alice (lecture+écriture), bob (lecture seule).
