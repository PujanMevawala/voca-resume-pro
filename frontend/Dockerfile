FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci || npm i

COPY index.html ./
COPY tailwind.config.js postcss.config.js ./
COPY src ./src

EXPOSE 5173
CMD ["npm", "run", "dev"]
