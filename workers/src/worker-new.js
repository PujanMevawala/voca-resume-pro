import 'dotenv/config';
import IORedis from 'ioredis';
import { Worker } from 'bullmq';
import mongoose from 'mongoose';
import { QdrantClient } from '@qdrant/js-client-rest';
import * as Minio from 'minio';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import FormData from 'form-data';

// Service URLs
const STT_URL = process.env.STT_URL || 'http://localhost:9002';
const TTS_URL = process.env.TTS_URL || 'http://localhost:5500';
const LLM_URL = process.env.LLM_URL || 'http://localhost:11435';
const EMBEDDER_URL = process.env.EMBEDDER_URL || 'http://localhost:3003';

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/voca-resume';
await mongoose.connect(MONGODB_URI);
console.log('✅ MongoDB connected');

// Redis connection
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});
console.log('✅ Redis connected');

// Qdrant
const qdrant = new QdrantClient({ url: process.env.QDRANT_URL || 'http://localhost:6333' });

// MinIO
const minio = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: Number(process.env.MINIO_PORT || 9000),
    useSSL: String(process.env.MINIO_USE_SSL || 'false') === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});
const BUCKET = process.env.MINIO_BUCKET || 'resumes';

// Models
const ResumeSchema = new mongoose.Schema(
    {
        userId: mongoose.Schema.Types.ObjectId,
        filename: String,
        storageObject: String,
        text: String,
        summary: String,
        chunks: [String],
        embeddingIds: [String],
        status: String,
        error: String,
    },
    { timestamps: true, collection: 'resumes' }
);
const Resume = mongoose.model('Resume', ResumeSchema);

const DocumentSchema = new mongoose.Schema(
    {
        userId: mongoose.Schema.Types.ObjectId,
        type: String,
        filename: String,
        storageObject: String,
        text: String,
        chunks: [String],
        embeddingIds: [String],
        status: String,
        error: String,
        metadata: Object,
    },
    { timestamps: true }
);
const Document = mongoose.model('Document', DocumentSchema);

const TranscriptSchema = new mongoose.Schema(
    {
        userId: mongoose.Schema.Types.ObjectId,
        audioFile: String,
        transcript: String,
        summary: String,
        chunks: [String],
        embeddingIds: [String],
        language: String,
        status: String,
        error: String,
    },
    { timestamps: true }
);
const Transcript = mongoose.model('Transcript', TranscriptSchema);

// Utility functions
async function ensureCollection(collectionName, vectorSize) {
    try {
        await qdrant.getCollection(collectionName);
    } catch {
        await qdrant.createCollection(collectionName, {
            vectors: { size: vectorSize, distance: 'Cosine' },
        });
        console.log(`✅ Created collection: ${collectionName}`);
    }
}

function chunkText(text, chunkSize = 500, overlap = 50) {
    const chunks = [];
    let start = 0;
    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        let chunk = text.slice(start, end);
        if (end < text.length) {
            const lastPeriod = chunk.lastIndexOf('. ');
            if (lastPeriod > chunkSize * 0.7) {
                chunk = chunk.slice(0, lastPeriod + 1);
            }
        }
        chunks.push(chunk.trim());
        start += chunk.length - overlap;
    }
    return chunks.filter(c => c.length > 20);
}

async function embedText(text) {
    try {
        const response = await axios.post(`${EMBEDDER_URL}/embed`, { text });
        return response.data.embedding;
    } catch (err) {
        console.error('Embedder error:', err.message);
        throw err;
    }
}

async function embedBatch(texts) {
    try {
        const response = await axios.post(`${EMBEDDER_URL}/embed/batch`, { texts });
        return response.data.embeddings;
    } catch (err) {
        console.error('Batch embedder error:', err.message);
        throw err;
    }
}

async function callLLM(prompt, system = 'You are a helpful assistant.') {
    try {
        const response = await axios.post(`${LLM_URL}/generate`, {
            prompt,
            system,
            temperature: 0.3,
        });
        return response.data.response;
    } catch (err) {
        console.error('LLM error:', err.message);
        throw err;
    }
}

// ============================================
// WORKER 1: Resume Processing
// ============================================
new Worker(
    'resume',
    async (job) => {
        if (job.name !== 'process-resume') return;

        const { resumeId, objectName, mimetype } = job.data;
        console.log(`[resume] Processing ${resumeId}`);

        const resume = await Resume.findById(resumeId);
        if (!resume) throw new Error('Resume not found');

        try {
            resume.status = 'processing';
            await resume.save();

            // Download file from MinIO
            const stream = await minio.getObject(BUCKET, objectName);
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            const buffer = Buffer.concat(chunks);

            // Extract text
            let text = '';
            if (mimetype?.includes('pdf')) {
                const data = await pdf(buffer);
                text = data.text || '';
            } else if (mimetype?.includes('word') || mimetype?.includes('docx')) {
                const res = await mammoth.extractRawText({ buffer });
                text = res.value || '';
            } else {
                text = buffer.toString('utf8');
            }

            resume.text = text;

            // Chunk text
            const textChunks = chunkText(text, 500, 50);
            resume.chunks = textChunks;

            // Embed chunks
            const embeddings = await embedBatch(textChunks);
            const vectorSize = embeddings[0]?.length || 384;

            await ensureCollection('resumes', vectorSize);

            // Upsert to Qdrant
            const points = textChunks.map((chunk, idx) => ({
                id: uuidv4(),
                vector: embeddings[idx],
                payload: {
                    resumeId: String(resume._id),
                    userId: String(resume.userId),
                    chunk,
                    chunkIndex: idx,
                },
            }));

            await qdrant.upsert('resumes', { wait: true, points });
            resume.embeddingIds = points.map(p => p.id);

            resume.status = 'ready';
            await resume.save();

            console.log(`[resume] ✅ Completed ${resumeId}`);
            return { ok: true };
        } catch (err) {
            resume.status = 'error';
            resume.error = err.message;
            await resume.save();
            console.error(`[resume] ❌ Failed ${resumeId}:`, err.message);
            throw err;
        }
    },
    { connection, concurrency: 2 }
);

// ============================================
// WORKER 2: Document Processing
// ============================================
new Worker(
    'document',
    async (job) => {
        if (job.name !== 'process-document') return;

        const { documentId, objectName, mimetype } = job.data;
        console.log(`[document] Processing ${documentId}`);

        const doc = await Document.findById(documentId);
        if (!doc) throw new Error('Document not found');

        try {
            doc.status = 'processing';
            await doc.save();

            // Download and extract text
            const stream = await minio.getObject(BUCKET, objectName);
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            const buffer = Buffer.concat(chunks);

            let text = '';
            if (mimetype?.includes('pdf')) {
                const data = await pdf(buffer);
                text = data.text || '';
            } else if (mimetype?.includes('word') || mimetype?.includes('docx')) {
                const res = await mammoth.extractRawText({ buffer });
                text = res.value || '';
            } else {
                text = buffer.toString('utf8');
            }

            doc.text = text;

            // Chunk and embed
            const textChunks = chunkText(text, 500, 50);
            doc.chunks = textChunks;

            const embeddings = await embedBatch(textChunks);
            const vectorSize = embeddings[0]?.length || 384;

            await ensureCollection('documents', vectorSize);

            const points = textChunks.map((chunk, idx) => ({
                id: uuidv4(),
                vector: embeddings[idx],
                payload: {
                    documentId: String(doc._id),
                    userId: String(doc.userId),
                    type: doc.type,
                    chunk,
                    chunkIndex: idx,
                },
            }));

            await qdrant.upsert('documents', { wait: true, points });
            doc.embeddingIds = points.map(p => p.id);

            doc.status = 'ready';
            await doc.save();

            console.log(`[document] ✅ Completed ${documentId}`);
            return { ok: true };
        } catch (err) {
            doc.status = 'error';
            doc.error = err.message;
            await doc.save();
            console.error(`[document] ❌ Failed ${documentId}:`, err.message);
            throw err;
        }
    },
    { connection, concurrency: 2 }
);

// ============================================
// WORKER 3: Audio Transcription
// ============================================
new Worker(
    'audio',
    async (job) => {
        if (job.name !== 'process-audio') return;

        const { transcriptId, objectName } = job.data;
        console.log(`[audio] Processing ${transcriptId}`);

        const transcript = await Transcript.findById(transcriptId);
        if (!transcript) throw new Error('Transcript not found');

        try {
            transcript.status = 'transcribing';
            await transcript.save();

            // Download audio from MinIO
            const stream = await minio.getObject(BUCKET, objectName);
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            const buffer = Buffer.concat(chunks);

            // Send to STT service
            const formData = new FormData();
            formData.append('file', buffer, { filename: objectName });
            formData.append('language', transcript.language || 'en');

            const sttResponse = await axios.post(`${STT_URL}/transcribe`, formData, {
                headers: formData.getHeaders(),
            });

            const text = sttResponse.data.transcript;
            transcript.transcript = text;
            transcript.status = 'summarizing';
            await transcript.save();

            // Generate summary
            const summaryPrompt = `Summarize the following transcript in 3-5 bullet points:\n\n${text}`;
            const summary = await callLLM(summaryPrompt, 'You are a helpful assistant that summarizes transcripts.');
            transcript.summary = summary;

            // Chunk and embed
            const textChunks = chunkText(text, 500, 50);
            transcript.chunks = textChunks;
            transcript.status = 'embedding';
            await transcript.save();

            const embeddings = await embedBatch(textChunks);
            const vectorSize = embeddings[0]?.length || 384;

            await ensureCollection('transcripts', vectorSize);

            const points = textChunks.map((chunk, idx) => ({
                id: uuidv4(),
                vector: embeddings[idx],
                payload: {
                    transcriptId: String(transcript._id),
                    userId: String(transcript.userId),
                    chunk,
                    chunkIndex: idx,
                },
            }));

            await qdrant.upsert('transcripts', { wait: true, points });
            transcript.embeddingIds = points.map(p => p.id);

            transcript.status = 'ready';
            await transcript.save();

            console.log(`[audio] ✅ Completed ${transcriptId}`);
            return { ok: true };
        } catch (err) {
            transcript.status = 'error';
            transcript.error = err.message;
            await transcript.save();
            console.error(`[audio] ❌ Failed ${transcriptId}:`, err.message);
            throw err;
        }
    },
    { connection, concurrency: 1 }
);

console.log('✅ All workers started');
console.log('   - resume worker (concurrency: 2)');
console.log('   - document worker (concurrency: 2)');
console.log('   - audio worker (concurrency: 1)');
