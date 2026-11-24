# ProtoAgenticUI

POC d'une interface **agentique omnicanale** : un même back-end headless sert un client web (Next.js) et un client mobile (Flutter). L'UI est pilotée par le serveur (A2UI) et un agent conversationnel (Mastra) appelle des outils métier via MCP, derrière une passerelle qui authentifie et autorise chaque appel.

## Où lire quoi
- [Architecture](specs/00-architecture.md) : composants, flux, décisions figées.
- [Contrats](specs/01-contrats.md) : A2UI, MCP, authentification, feature flags.
- [État d'avancement](plan/STATUS.md) : ce qui est vérifié et ce qui ne l'est pas.
- [ADR](adr/README.md) : les décisions d'architecture et leur justification.

## Démarrage rapide
```bash
npm install
make up
cp apps/web/.env.example apps/web/.env.local
npm run dev -w @poc/web   # http://localhost:3001
```
Utilisateur par défaut (dev uniquement) : `alice` / `alice`. Détails dans le [README du dépôt](https://github.com/spawnrider/PocAgenticUI#readme).
