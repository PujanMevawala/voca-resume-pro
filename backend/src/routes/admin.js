import { User } from '../models/User.js';
import { Resume } from '../models/Resume.js';
import { Document } from '../models/Document.js';
import { Transcript } from '../models/Transcript.js';
import { Chat } from '../models/Chat.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

export async function registerAdminRoutes(app) {
    const queues = app.queues;

    /**
     * Get system stats
     * GET /api/admin/stats
     */
    app.get('/api/admin/stats', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
        try {
            const [
                userCount,
                resumeCount,
                documentCount,
                transcriptCount,
                chatCount,
            ] = await Promise.all([
                User.countDocuments(),
                Resume.countDocuments(),
                Document.countDocuments(),
                Transcript.countDocuments(),
                Chat.countDocuments(),
            ]);

            // Queue stats
            const queueStats = {};
            for (const [name, queue] of Object.entries(queues.queues)) {
                const counts = await queue.getJobCounts();
                queueStats[name] = counts;
            }

            return {
                success: true,
                stats: {
                    users: userCount,
                    resumes: resumeCount,
                    documents: documentCount,
                    transcripts: transcriptCount,
                    chats: chatCount,
                    queues: queueStats,
                },
            };
        } catch (err) {
            app.log.error('Admin stats error:', err);
            reply.code(500);
            return { error: err.message };
        }
    });

    /**
     * List all users
     * GET /api/admin/users
     */
    app.get('/api/admin/users', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
        try {
            const { page = 1, limit = 50 } = request.query;
            const skip = (page - 1) * limit;

            const [users, total] = await Promise.all([
                User.find()
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .select('-passwordHash -refreshToken'),
                User.countDocuments(),
            ]);

            return {
                success: true,
                users,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / limit),
                },
            };
        } catch (err) {
            reply.code(500);
            return { error: err.message };
        }
    });

    /**
     * Get user details
     * GET /api/admin/users/:id
     */
    app.get('/api/admin/users/:id', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
        try {
            const { id } = request.params;
            const user = await User.findById(id).select('-passwordHash -refreshToken');

            if (!user) {
                reply.code(404);
                return { error: 'User not found' };
            }

            const [resumeCount, documentCount, transcriptCount, chatCount] = await Promise.all([
                Resume.countDocuments({ userId: id }),
                Document.countDocuments({ userId: id }),
                Transcript.countDocuments({ userId: id }),
                Chat.countDocuments({ userId: id }),
            ]);

            return {
                success: true,
                user,
                stats: {
                    resumes: resumeCount,
                    documents: documentCount,
                    transcripts: transcriptCount,
                    chats: chatCount,
                },
            };
        } catch (err) {
            reply.code(500);
            return { error: err.message };
        }
    });

    /**
     * Update user status
     * PATCH /api/admin/users/:id
     */
    app.patch('/api/admin/users/:id', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
        try {
            const { id } = request.params;
            const { isActive, role } = request.body;

            const update = {};
            if (typeof isActive === 'boolean') update.isActive = isActive;
            if (role && ['user', 'admin'].includes(role)) update.role = role;

            const user = await User.findByIdAndUpdate(id, update, { new: true })
                .select('-passwordHash -refreshToken');

            if (!user) {
                reply.code(404);
                return { error: 'User not found' };
            }

            return { success: true, user };
        } catch (err) {
            reply.code(500);
            return { error: err.message };
        }
    });

    /**
     * Get queue jobs
     * GET /api/admin/queues/:queueName
     */
    app.get('/api/admin/queues/:queueName', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
        try {
            const { queueName } = request.params;
            const { state = 'active', limit = 50 } = request.query;

            const queue = queues.queues[queueName];
            if (!queue) {
                reply.code(404);
                return { error: 'Queue not found' };
            }

            let jobs = [];
            if (state === 'active') {
                jobs = await queue.getActive(0, limit - 1);
            } else if (state === 'waiting') {
                jobs = await queue.getWaiting(0, limit - 1);
            } else if (state === 'failed') {
                jobs = await queue.getFailed(0, limit - 1);
            } else if (state === 'completed') {
                jobs = await queue.getCompleted(0, limit - 1);
            }

            return {
                success: true,
                queue: queueName,
                state,
                jobs: jobs.map(j => ({
                    id: j.id,
                    name: j.name,
                    data: j.data,
                    progress: j.progress,
                    attemptsMade: j.attemptsMade,
                    timestamp: j.timestamp,
                })),
            };
        } catch (err) {
            reply.code(500);
            return { error: err.message };
        }
    });

    /**
     * Clean queue
     * POST /api/admin/queues/:queueName/clean
     */
    app.post('/api/admin/queues/:queueName/clean', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
        try {
            const { queueName } = request.params;
            const { grace = 3600000 } = request.body; // 1 hour default

            const queue = queues.queues[queueName];
            if (!queue) {
                reply.code(404);
                return { error: 'Queue not found' };
            }

            await queue.clean(grace, 100, 'completed');
            await queue.clean(grace, 100, 'failed');

            return { success: true, message: 'Queue cleaned' };
        } catch (err) {
            reply.code(500);
            return { error: err.message };
        }
    });

    /**
     * Health check for all services
     * GET /api/admin/health
     */
    app.get('/api/admin/health', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
        try {
            const services = {};

            // Check MongoDB
            services.mongodb = app.mongo ? 'healthy' : 'unhealthy';

            // Check Redis
            try {
                await queues.connection.ping();
                services.redis = 'healthy';
            } catch {
                services.redis = 'unhealthy';
            }

            // Check Qdrant
            try {
                await app.qdrant.getCollections();
                services.qdrant = 'healthy';
            } catch {
                services.qdrant = 'unhealthy';
            }

            // Check MinIO
            try {
                await app.minio.listBuckets();
                services.minio = 'healthy';
            } catch {
                services.minio = 'unhealthy';
            }

            return { success: true, services };
        } catch (err) {
            reply.code(500);
            return { error: err.message };
        }
    });
}
