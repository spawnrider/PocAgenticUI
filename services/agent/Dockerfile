FROM node:22-alpine
WORKDIR /app
COPY services/agent/package.json ./
RUN npm install
COPY services/agent/src ./src
CMD ["npx","mastra","dev","--dir","src"]
