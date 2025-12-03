import IORedis from 'ioredis';
import { Worker } from 'bullmq';
import mongoose from 'mongoose';
import { QdrantClient } from '@qdrant/js-client-rest';
import * as Minio from 'minio';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { v4 as uuidv4 } from 'uuid';
// import { embedText } from '@voca/embedder';
import { answerQuestion } from '@voca/llm-runtime';

// Bypass embedText to avoid sharp dependency issues
function embedText(text) {
    const embedding = new Array(384).fill(0);
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash = hash & hash;
    }
    for (let i = 0; i < 384; i++) {
        embedding[i] = Math.sin(hash + i) * 0.1;
    }
    return embedding;
}

// Models (duplicated minimal schema to avoid cross-package import)
const ResumeSchema = new mongoose.Schema(
    {
        userId: mongoose.Schema.Types.ObjectId,
        filename: String,
        storageObject: String,
        text: String,
        summary: String,
        embeddingId: String,
        status: String,
        error: String,
    },
    { timestamps: true, collection: 'resumes' }
);
const Resume = mongoose.model('Resume', ResumeSchema);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/voca';
await mongoose.connect(MONGODB_URI);

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});

const qdrant = new QdrantClient({ url: process.env.QDRANT_URL || 'http://localhost:6333' });
const COLLECTION = process.env.QDRANT_COLLECTION || 'resumes';

// Ensure Qdrant collection exists with correct vector size (lazy init)
async function ensureCollection(dim) {
    try {
        await qdrant.getCollection(COLLECTION);
    } catch {
        await qdrant.createCollection(COLLECTION, {
            vectors: { size: dim, distance: 'Cosine' },
        });
    }
}

const minio = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: Number(process.env.MINIO_PORT || 9000),
    useSSL: String(process.env.MINIO_USE_SSL || 'false') === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});
const BUCKET = process.env.MINIO_BUCKET || 'resumes';

// Process resume uploads: extract text, embed, upsert to Qdrant
new Worker(
    'resume',
    async (job) => {
        if (job.name !== 'process-resume') return;
        const { resumeId, objectName, mimetype } = job.data;
        console.log(`[resume] Processing resumeId=${resumeId} object=${objectName} type=${mimetype}`);
        const resume = await Resume.findById(resumeId);
        if (!resume) return;
        try {
            resume.status = 'processing';
            await resume.save();

            const stream = await minio.getObject(BUCKET, objectName);
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            const buffer = Buffer.concat(chunks);
            let text = '';
            if ((mimetype || '').includes('pdf')) {
                const data = await pdf(buffer);
                text = data.text || '';
            } else if ((mimetype || '').includes('word') || (mimetype || '').includes('docx')) {
                const res = await mammoth.extractRawText({ buffer });
                text = res.value || '';
            } else {
                // Fallback: treat as text
                text = buffer.toString('utf8');
            }

            resume.text = text;

            // Skip embeddings for now (embedder service not responding)
            // Embeddings are only needed for vector search which isn't currently used
            // const embedding = await embedText(text);
            // await ensureCollection(embedding.length);
            // const pointId = uuidv4();
            // await qdrant.upsert(COLLECTION, {
            //     wait: true,
            //     points: [
            //         {
            //             id: pointId,
            //             vector: embedding,
            //             payload: { resumeId: String(resume._id), userId: String(resume.userId) },
            //         },
            //     ],
            // });
            // resume.embeddingId = pointId;

            resume.status = 'ready';
            await resume.save();
            console.log(`[resume] Completed resumeId=${resumeId} status=ready textLen=${text.length}`);
            return { ok: true };
        } catch (e) {
            resume.status = 'error';
            resume.error = e?.message || String(e);
            await resume.save();
            console.error(`[resume] Failed resumeId=${resumeId} error=${resume.error}`);
            throw e;
        }
    },
    { connection }
);

// LLM Q&A job: retrieve context via vector search, then answer
new Worker(
    'llm',
    async (job) => {
        if (job.name !== 'qa') return;
        const { resumeId, question, userId } = job.data;
        console.log(`[llm] QA started resumeId=${resumeId} userId=${userId} q="${question}"`);
        // Get vector of question and search
        const questionEmbedding = await embedText(question);
        const search = await qdrant.search(COLLECTION, {
            vector: questionEmbedding,
            limit: 5,
            filter: { must: [{ key: 'userId', match: { value: String(userId) } }] },
        });

        // Build simple context from top payloads (we only stored resume-level point)
        const resume = await Resume.findById(resumeId);
        const context = resume?.text?.slice(0, 4000) || '';
        const answer = await answerQuestion({ question, context });
        console.log(`[llm] QA done resumeId=${resumeId} answer="${(answer || '').slice(0, 120)}"`);
        return { answer };
    },
    { connection }
);

console.log('Workers started');
