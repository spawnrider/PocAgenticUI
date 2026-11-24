# Diagramme d'architecture interactif

Vue détaillée des composants du POC et de leurs échanges, générée avec Archify à partir de la spec [`architecture-detaillee.spec.json`](../assets/diagrams/architecture-detaillee.spec.json) (compose `protoagenticui`).

<iframe src="../../assets/diagrams/architecture-detaillee.html" title="Architecture détaillée ProtoAgenticUI" style="width:100%;height:80vh;min-height:620px;border:1px solid var(--md-default-fg-color--lightest);border-radius:6px" loading="lazy"></iframe>

[Ouvrir en plein écran](../assets/diagrams/architecture-detaillee.html){ target=_blank }

## Lecture

- **Canaux** : Next.js (CopilotKit, `@a2ui/react`) et Flutter (genui).
- **Expérience** : le BFF sert les écrans SDUI (Strapi, cache Redis, flags Unleash) ; le service agent Mastra conduit la conversation et émet l'A2UI.
- **Accès au SI** : agentgateway valide le JWT Keycloak, applique l'autorisation MCP et route vers les domaines (MCP CRM).
- **Transverses** : Keycloak (OIDC, token exchange), Unleash, registre `server.json`, PostgreSQL partagé.

Toute écriture via un outil MCP passe par la surface `ConfirmAction` (voir [ADR 0006](../adr/0006-garde-fou-ecriture-cote-serveur.md)).

!!! note
    Le diagramme reflète `docker-compose.yml` : les flux A2A (Flutter) et la découverte via le registre sont ceux décrits dans les specs, pas tous câblés dans le code actuel. Pour régénérer : modifier la spec JSON puis relancer `archify deliver`.
