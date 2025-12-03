FROM node:20-slim

# Install dependencies for sharp and onnxruntime
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci || npm install

COPY src ./src

ENV NODE_ENV=development
EXPOSE 3001

CMD ["npm", "run", "dev"]
