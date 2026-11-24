FROM node:22-alpine
WORKDIR /app
COPY services/bff/package.json ./
RUN npm install
COPY services/bff/src ./src
CMD ["npx","tsx","src/server.ts"]
