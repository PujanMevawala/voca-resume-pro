import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import mongoose from 'mongoose';
import { QdrantClient } from '@qdrant/js-client-rest';
import { MinioService } from './services/minio.js';
import { queues } from './services/queues.js';
import { logger } from './plugins/logger.js';
import { metricsPlugin } from './plugins/metrics.js';
import { registerRoutes } from './routes/index.js';
import { initializeTaskRouter } from './services/taskRouter.js';

const app = Fastify({
    logger,
    trustProxy: true,
    requestIdHeader: 'x-request-id',
});

// Global error handler
app.setErrorHandler((error, request, reply) => {
    app.log.error({ err: error, url: request.url, method: request.method }, 'Request error');

    const statusCode = error.statusCode || 500;
    const message = statusCode === 500 ? 'Internal Server Error' : error.message;

    reply.code(statusCode).send({
        error: message,
        statusCode,
        path: request.url,
    });
});

// Core plugins
await app.register(cors, {
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});
await app.register(jwt, { secret: process.env.JWT_SECRET || 'dev_jwt_secret_change_me' });
await app.register(rateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX || 500),
    timeWindow: process.env.RATE_LIMIT_TIME_WINDOW || '1 minute',
    skipOnError: true, // Don't count errors against the limit
});
await app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024 } });
await app.register(metricsPlugin);

// Services wiring
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/voca';
await mongoose.connect(MONGODB_URI);

const qdrant = new QdrantClient({ url: process.env.QDRANT_URL || 'http://localhost:6333' });
app.decorate('qdrant', qdrant);

const minio = new MinioService({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: Number(process.env.MINIO_PORT || 9000),
    useSSL: String(process.env.MINIO_USE_SSL || 'false') === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    bucket: process.env.MINIO_BUCKET || 'resumes',
});
await minio.ensureBucket();
app.decorate('minio', minio);

// Initialize queues
await queues.init();
app.decorate('queues', queues);

// Initialize task router (vector-based query routing)
await initializeTaskRouter();
app.log.info('Task router initialized');

// Routes
registerRoutes(app);

const port = Number(process.env.BACKEND_PORT || 3001);
const host = process.env.BACKEND_HOST || '0.0.0.0';

try {
    await app.listen({ port, host });
    app.log.info(`Backend running on http://${host}:${port}`);
    app.log.info(`Features: Analysis, Suggestions, Interview Questions, Job Fit Score, Smart Routing`);
} catch (err) {
    app.log.error(err);
    process.exit(1);
}
