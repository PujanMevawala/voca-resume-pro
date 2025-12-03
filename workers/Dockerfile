FROM node:20-bookworm-slim
WORKDIR /app

# Copy workers manifest to /app root
COPY workers/package.json package-lock.json* ./
# Place local service packages under /app/services
COPY services/embedder ./services/embedder
COPY services/llm_runtime ./services/llm_runtime

RUN npm i

# Copy workers source under /app/workers/src
COPY workers/src ./workers/src

CMD ["npm", "run", "dev"]
