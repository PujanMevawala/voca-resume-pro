import IORedis from 'ioredis';
import { Queue } from 'bullmq';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});

const resumeQueue = new Queue('resume', { connection });
const llmQueue = new Queue('llm', { connection });
const ttsQueue = new Queue('tts', { connection });
const sttQueue = new Queue('stt', { connection });

export const queues = {
    init: async () => { },
    connection,
    resumeQueue,
    llmQueue,
    ttsQueue,
    sttQueue,
};
