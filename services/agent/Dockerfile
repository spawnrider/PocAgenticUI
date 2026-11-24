FROM node:22-alpine
WORKDIR /app
COPY services/agent/package.json ./
RUN npm install --no-audit --no-fund
COPY tsconfig.base.json /tsconfig.base.json
COPY services/agent/src ./src
ENV NODE_ENV=production
CMD ["npx","tsx","--no-cache","src/server.ts"]
