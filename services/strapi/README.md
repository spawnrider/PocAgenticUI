Le projet Strapi n'est pas généré ici (pas de réseau). Faire :
  npx create-strapi@latest . --quickstart=false   (PostgreSQL), puis copier src/ de ce dossier par-dessus.
Créer un Admin API token, le mettre dans STRAPI_API_TOKEN, et un écran "home" avec un bloc OfferBanner (flagKey: screen.home.offer-banner).
Ajouter un Dockerfile (node:22) ; le compose le référence.
