import { QdrantClient } from '@qdrant/js-client-rest';
import { embedText } from '../utils/embeddings.js';
import IORedis from 'ioredis';

const qdrant = new QdrantClient({ url: process.env.QDRANT_URL || 'http://localhost:6333' });
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
const TASKS_COLLECTION = 'task_router';

// Canonical task definitions with example queries for training
const TASKS = [
    {
        id: 'resume_analysis',
        name: 'Resume Analysis',
        description: 'Analyze resume for strengths, weaknesses, ATS improvements',
        examples: [
            'analyze my resume',
            'what are the strengths and weaknesses',
            'ATS improvements needed',
            'review my resume',
            'resume analysis',
        ],
    },
    {
        id: 'suggestions',
        name: 'Suggestions',
        description: 'Get actionable improvements for resume',
        examples: [
            'how can I improve my resume',
            'suggestions for improvement',
            'make my resume better',
            'tone improvements',
            'clarity enhancement',
        ],
    },
    {
        id: 'interview_questions',
        name: 'Interview Questions',
        description: 'Generate technical interview questions based on resume',
        examples: [
            'interview questions',
            'what questions might I be asked',
            'technical interview prep',
            'practice questions',
            'interview preparation',
        ],
    },
    {
        id: 'job_fit_score',
        name: 'Job Fit Score',
        description: 'Calculate fit score for job description',
        examples: [
            'how well do I fit this job',
            'job match score',
            'calculate fit score',
            'am I a good fit',
            'match with job description',
        ],
    },
    {
        id: 'generate_script',
        name: 'Generate Script',
        description: 'Create conversational script for TTS',
        examples: [
            'generate a script',
            'create voice script',
            'TTS script',
            'spoken summary',
            'audio script',
        ],
    },
    {
        id: 'general_query',
        name: 'General Query',
        description: 'Answer general questions about resume',
        examples: [
            'what is my experience',
            'tell me about my skills',
            'what projects have I done',
            'my education background',
        ],
    },
];

/**
 * Initialize task router collection in Qdrant with canonical task embeddings
 */
export async function initializeTaskRouter() {
    try {
        await qdrant.getCollection(TASKS_COLLECTION);
        console.log('[task-router] Collection already exists');
    } catch {
        // Create collection
        const sampleEmbed = await embedText('hello');
        await qdrant.createCollection(TASKS_COLLECTION, {
            vectors: { size: sampleEmbed.length, distance: 'Cosine' },
        });
        console.log('[task-router] Created collection');
    }

    // Index all task examples
    const points = [];
    let pointId = 0; // Use integer IDs for Qdrant
    for (const task of TASKS) {
        for (const example of task.examples) {
            const embedding = await embedText(example);
            points.push({
                id: pointId++, // Qdrant requires integer or UUID
                vector: embedding,
                payload: {
                    taskId: task.id,
                    taskName: task.name,
                    example,
                },
            });
        }
    }

    if (points.length > 0) {
        await qdrant.upsert(TASKS_COLLECTION, {
            wait: true,
            points,
        });
        console.log(`[task-router] Indexed ${points.length} task examples`);
    }
}

/**
 * Route a user query to the appropriate task using vector similarity
 * @param {string} query - User's question
 * @returns {Promise<{taskId: string, taskName: string, confidence: number}>}
 */
export async function routeQuery(query) {
    const cacheKey = `task_route:${query.toLowerCase().trim()}`;

    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }

    // Embed query
    const queryEmbedding = await embedText(query);

    // Search for similar tasks
    const results = await qdrant.search(TASKS_COLLECTION, {
        vector: queryEmbedding,
        limit: 1,
        with_payload: true,
    });

    if (results.length === 0) {
        // Default to general query
        return {
            taskId: 'general_query',
            taskName: 'General Query',
            confidence: 0.5,
        };
    }

    const result = {
        taskId: results[0].payload.taskId,
        taskName: results[0].payload.taskName,
        confidence: results[0].score,
    };

    // Cache for 1 hour
    await redis.setex(cacheKey, 3600, JSON.stringify(result));

    return result;
}

/**
 * Get task by ID
 */
export function getTask(taskId) {
    return TASKS.find(t => t.id === taskId);
}

/**
 * List all available tasks
 */
export function listTasks() {
    return TASKS.map(({ id, name, description }) => ({ id, name, description }));
}
