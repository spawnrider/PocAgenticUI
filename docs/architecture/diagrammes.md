# Diagrammes

> Les schémas du Claude Doc étaient des widgets non exportables en Markdown. Ils sont **reconstruits ici en Mermaid** à partir du texte des documents ; ils restent fidèles aux flux décrits mais ne reproduisent pas la mise en page d'origine. Le plan à 5 phases (~6 mois) n'est pas redessiné.

## Vue d'ensemble

```mermaid
flowchart LR
  subgraph Canaux
    FL[App Flutter\ngenui + A2A]
    WEB[Next.js\nCopilotKit + @a2ui/react]
    AI[Assistants IA externes\nClaude / ChatGPT]
  end
  BFF[BFF TypeScript\nSDUI, cache, flags]
  AGT[Service agent\nMastra]
  GW[agentgateway\nauthN/authZ, audit]
  REG[(Registre ToolHive\nserver.json)]
  KC[Keycloak]
  subgraph SI
    CRM[MCP CRM]
    CMS[MCP Strapi]
    COM[MCP Commerce]
  end
  STR[Strapi]
  UNL[Unleash]
  WEB -- REST --> BFF
  FL -- REST --> BFF
  WEB -- AG-UI --> AGT
  FL -- A2A --> AGT
  AI -- MCP --> GW
  BFF -- /api --> GW
  BFF --> STR
  BFF --> UNL
  AGT -- MCP, /llm --> GW
  AGT --> UNL
  GW --> CRM & CMS & COM
  GW -. découverte .-> REG
  AGT -. tool search .-> REG
  GW -. JWT .-> KC
  AGT -. token exchange .-> KC
```

## Architecture détaillée (4 couches + transverses)

```mermaid
flowchart TB
  subgraph L1[1. Canaux]
    A[Flutter] --- B[Next.js]
  end
  subgraph L2[2. Expérience]
    C[BFF\nécrans SDUI] --- D[Service agent\nconversation + A2UI]
  end
  subgraph L3[3. Accès au SI]
    E[agentgateway\nMCP · A2A · LLM · HTTP]
  end
  subgraph L4[4. Domaines]
    F[MCP CRM] --- G[MCP Strapi] --- H[MCP Commerce] --- I[API OpenAPI→MCP]
  end
  subgraph T[Transverses]
    K[Keycloak] --- U[Unleash] --- R[Registre] --- O[OTel + Langfuse] --- S[Strapi]
  end
  L1 --> L2 --> L3 --> L4
```

## Workflow 1 — Afficher un écran (sans LLM)

```mermaid
sequenceDiagram
  participant App
  participant BFF
  participant Redis
  participant Strapi
  participant Unleash as Unleash (SDK local)
  participant GW as agentgateway
  participant API as API métier
  App->>BFF: GET /screens/home (jeton, locale, version catalogue)
  BFF->>Redis: écran en cache ?
  alt absent
    BFF->>Strapi: lecture écran publié
    Strapi-->>BFF: layout + sections
  end
  BFF->>Unleash: évaluer flagKey des sections
  loop chaque dataSource
    BFF->>GW: /api/{domaine}
    GW->>API: requête (secret injecté)
    API-->>GW: données
    GW-->>BFF: données
  end
  BFF-->>App: messages A2UI
  App->>App: rendu natif
```

## Workflow 2 — Conversation avec UI générée

```mermaid
sequenceDiagram
  participant App
  participant AGT as Service agent
  participant KC as Keycloak
  participant GW as agentgateway
  participant LLM
  participant CRM as MCP CRM
  App->>AGT: message (AG-UI web / A2A Flutter)
  AGT->>KC: token exchange (aud=agentgateway)
  KC-->>AGT: jeton réduit
  AGT->>GW: tools/list
  GW-->>AGT: tools autorisés (filtrés par flags côté agent)
  AGT->>GW: /llm (conversation, tools, catalogue A2UI)
  GW->>LLM: inférence
  LLM-->>AGT: appel crm_get_customer_summary
  AGT->>GW: tools/call
  GW->>CRM: règle CEL + audit
  CRM-->>AGT: résumé structuré
  AGT->>AGT: génère + valide la surface CustomerSummary
  AGT-->>App: stream texte + messages A2UI
```

## Workflow 3 — Écriture avec validation humaine

```mermaid
sequenceDiagram
  participant U as Utilisateur
  participant AGT as Service agent (Mastra)
  participant PG as PostgreSQL
  participant GW as agentgateway
  participant CRM as MCP CRM
  AGT->>PG: suspend workflow (état)
  AGT-->>U: surface ConfirmAction (récap)
  U->>AGT: confirme / corrige
  AGT->>PG: reprise du workflow
  AGT->>GW: crm_create_opportunity (clé d'idempotence)
  GW->>GW: scope crm.write + rôle sales (CEL), audit
  GW->>CRM: création
  CRM-->>AGT: identifiant
  AGT-->>U: surface mise à jour (succès, lien)
```

## Workflow 4 — Ajouter un service au SI

```mermaid
flowchart LR
  A[Équipe domaine :\nMCP server + server.json] --> B[CI : contrats, évals,\nscan, signature]
  B --> C[Fusion → registre\nstatut preview]
  C --> D[Repo platform : config\nagentgateway + CEL]
  D --> E[Flag agent.tool.nom\ncréé, désactivé]
  E --> F[Argo CD déploie\nrollout 10 % → 100 %]
  F --> G[Registre : statut active]
```
