import { Transcript } from '../models/Transcript.js';
import { authenticate } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

export async function registerTranscriptRoutes(app) {
    const minio = app.minio;
    const queues = app.queues;

    /**
     * Upload audio for transcription
     * POST /api/transcripts/upload
     */
    app.post('/api/transcripts/upload', { preHandler: authenticate }, async (request, reply) => {
        try {
            const data = await request.file();
            if (!data) {
                reply.code(400);
                return { error: 'No file uploaded' };
            }

            const buffer = await data.toBuffer();
            const objectName = `audio/${request.user.userId}/${uuidv4()}_${data.filename}`;

            await minio.putObject(objectName, buffer, buffer.length, data.mimetype);

            const transcript = new Transcript({
                userId: request.user.userId,
                audioFile: objectName,
                language: request.body.language || 'en',
                status: 'pending',
            });
            await transcript.save();

            // Queue for processing
            await queues.addJob('audio', 'process-audio', {
                transcriptId: transcript._id.toString(),
                objectName,
            });

            return {
                success: true,
                transcript: {
                    id: transcript._id,
                    status: transcript.status,
                    language: transcript.language,
                },
            };
        } catch (err) {
            app.log.error('Transcript upload error:', err);
            reply.code(500);
            return { error: err.message };
        }
    });

    /**
     * List user's transcripts
     * GET /api/transcripts
     */
    app.get('/api/transcripts', { preHandler: authenticate }, async (request, reply) => {
        try {
            const transcripts = await Transcript.find({ userId: request.user.userId })
                .sort({ createdAt: -1 })
                .select('-chunks -embeddingIds');

            return {
                success: true,
                transcripts: transcripts.map(t => ({
                    id: t._id,
                    status: t.status,
                    language: t.language,
                    hasTranscript: !!t.transcript,
                    hasSummary: !!t.summary,
                    createdAt: t.createdAt,
                    updatedAt: t.updatedAt,
                })),
            };
        } catch (err) {
            reply.code(500);
            return { error: err.message };
        }
    });

    /**
     * Get transcript by ID
     * GET /api/transcripts/:id
     */
    app.get('/api/transcripts/:id', { preHandler: authenticate }, async (request, reply) => {
        try {
            const { id } = request.params;
            const transcript = await Transcript.findOne({ _id: id, userId: request.user.userId });

            if (!transcript) {
                reply.code(404);
                return { error: 'Transcript not found' };
            }

            return { success: true, transcript };
        } catch (err) {
            reply.code(500);
            return { error: err.message };
        }
    });

    /**
     * Delete transcript
     * DELETE /api/transcripts/:id
     */
    app.delete('/api/transcripts/:id', { preHandler: authenticate }, async (request, reply) => {
        try {
            const { id } = request.params;
            const transcript = await Transcript.findOne({ _id: id, userId: request.user.userId });

            if (!transcript) {
                reply.code(404);
                return { error: 'Transcript not found' };
            }

            // Delete audio from MinIO
            try {
                await minio.removeObject(transcript.audioFile);
            } catch (err) {
                app.log.warn('Failed to delete audio from MinIO:', err);
            }

            // Delete vectors
            if (transcript.embeddingIds?.length > 0) {
                try {
                    await app.qdrant.delete('transcripts', {
                        wait: true,
                        points: transcript.embeddingIds,
                    });
                } catch (err) {
                    app.log.warn('Failed to delete from Qdrant:', err);
                }
            }

            await Transcript.deleteOne({ _id: id });

            return { success: true };
        } catch (err) {
            reply.code(500);
            return { error: err.message };
        }
    });
}
