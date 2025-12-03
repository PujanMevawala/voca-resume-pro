import { healthRoutes } from './health.js';
import { userRoutes } from './user.js';
import { resumeRoutes } from './resume.js';
import { audioRoutes } from './audio.js';
import { analysisRoutes } from './analysis.js';
import { registerChatRoutes } from './chat.js';
import { registerChatRAGRoutes } from './chatRAG.js';
import { registerDocumentRoutes } from './documents.js';
import { registerAdminRoutes } from './admin.js';
import { registerTranscriptRoutes } from './transcripts.js';

export function registerRoutes(app) {
    // Root hint route
    app.get('/', async () => ({
        message: 'VocaResume Pro API - Complete AI Resume Assistant',
        version: '3.0.0',
        features: [
            'Resume Analysis & Processing',
            'Document Library Management',
            'Audio Transcription (STT)',
            'Text-to-Speech (TTS)',
            'AI Chat Assistant with RAG',
            'Job Description Intelligence',
            'Vector Search & Embeddings',
            'Admin Panel',
            'Local LLM (Ollama)',
        ],
        endpoints: {
            health: '/api/health',
            auth: '/api/user/*',
            resumes: '/api/resume/*',
            documents: '/api/documents/*',
            chat: '/api/chat/*',
            analysis: '/api/analysis/*',
            audio: '/api/audio/*',
            admin: '/api/admin/*',
        },
    }));

    app.register(healthRoutes, { prefix: '/api/health' });
    app.register(userRoutes, { prefix: '/api/user' });
    app.register(resumeRoutes, { prefix: '/api/resume' });
    registerChatRoutes(app);
    registerChatRAGRoutes(app);
    registerDocumentRoutes(app);
    registerTranscriptRoutes(app);
    registerAdminRoutes(app);
    app.register(audioRoutes, { prefix: '/api/audio' });
    app.register(analysisRoutes, { prefix: '/api/analysis' });
}
