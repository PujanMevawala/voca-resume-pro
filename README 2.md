# VocaResume Pro

AI-powered resume assistant: upload resumes, generate conversational summaries, ask questions, and use TTS/STT — all running locally via Docker.

## Tech stack

- Backend: Node.js + Fastify
- Frontend: React + Vite
- Database: MongoDB
- Cache & Queues: Redis (BullMQ)
- Vector DB: Qdrant
- File storage: MinIO (S3-compatible)
- TTS: OpenTTS (container)
- STT: Whisper ASR webservice (container)

## Monorepo layout

```
voca-resume-pro/
├─ backend/            # Fastify server APIs & integrations
├─ frontend/           # React + Vite SPA
├─ workers/            # BullMQ workers for async pipelines
├─ services/
│  ├─ embedder/        # Embedding generation via transformers.js
│  └─ llm_runtime/     # LLM routing (Groq/Gemini) with fallbacks
└─ infra/
	└─ docker-compose.yml
```

## Quick start (Docker)

1) Copy env

```
cp .env.example .env  # optional if you want to tweak defaults
```

2) Start core stack (no heavy audio images)

```
npm run docker:up
```

To include Audio (OpenTTS + Whisper), use the audio profile (requires extra disk space):

```
docker compose -f infra/docker-compose.yml --profile audio up --build
```

3) Open apps

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- MinIO console: http://localhost:9001
- Prometheus metrics: http://localhost:3001/metrics

Audio services (if profile enabled):

- OpenTTS: http://localhost:5500
- Whisper ASR: http://localhost:9002

Stop and clean:

```
npm run docker:down
```

## Local development (without Docker)

1) Ensure you have MongoDB, Redis, Qdrant, MinIO, OpenTTS, and Whisper services running locally (or edit `.env.example` to point to containers).

2) Install deps and run all:

```
npm i
npm run dev
```

Opens:

- Frontend dev server: http://localhost:5173
- Backend dev server: http://localhost:3001

## Environment variables

See `.env.example` for full list (Mongo, Redis, Qdrant, MinIO, JWT secret, TTS/STT URLs, LLM API keys).

## Acceptance criteria coverage

- Upload → process in worker → embeddings in Qdrant
- Summary generation via LLM routing (Groq/Gemini), with local fallback summarizer
- Ask questions (queued) using embedding search context
- TTS via OpenTTS; STT via Whisper ASR service
- JWT auth and rate-limiting
- Logging (Winston) + metrics (Prometheus)
- Hot reload: nodemon (backend/workers) & Vite HMR (frontend)

## Troubleshooting

- If embeddings fail on first run, the model will download at runtime. Ensure network access on first start.
- Whisper service runs on port 9002 (host) → maps to 9000 internal; backend uses `WHISPER_URL`.
- MinIO default credentials: `minioadmin` / `minioadmin` (change in production).

## License

MIT
