# ADR 0007 — SDUI : Strapi + BFF, flags Unleash indépendants

**Statut :** Acceptée

## Contexte
Les écrans doivent être modifiables sans déploiement, et certaines sections activables par feature flag.

## Décision
Strapi stocke écrans et sections ; chaque section porte seulement une `flagKey` (chaîne). Le BFF lit Strapi (token API), met en cache les sections brutes dans Redis (30 s), applique ensuite le filtrage par flags Unleash, puis convertit en A2UI.

## Conséquences
- Strapi et Unleash n'ont aucun couplage ; le filtre est appliqué après le cache pour rester à jour.
- Flags utilisés : `agent.enabled`, `agent.tool.<name>`, `screen.home.offer-banner`.
