FROM node:22-alpine
WORKDIR /app
# Générer le projet une fois : npx create-strapi@latest . --quickstart --no-run, puis copier src/ ci-dessous.
COPY . .
RUN npm install --no-audit --no-fund && npm run build
CMD ["npm","run","start"]
