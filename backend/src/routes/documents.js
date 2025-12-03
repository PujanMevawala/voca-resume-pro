import { Document } from '../models/Document.js';
import { authenticate } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

export async function registerDocumentRoutes(app) {
    const minio = app.minio;
    const queues = app.queues;

    /**
     * Upload document
     * POST /api/documents/upload
     */
    app.post('/api/documents/upload', { preHandler: authenticate }, async (request, reply) => {
        try {
            const data = await request.file();
            if (!data) {
                reply.code(400);
                return { error: 'No file uploaded' };
            }

            const buffer = await data.toBuffer();
            const objectName = `docs/${request.user.userId}/${uuidv4()}_${data.filename}`;

            await minio.putObject(objectName, buffer, buffer.length, data.mimetype);

            const doc = new Document({
                userId: request.user.userId,
                type: request.body.type || 'other',
                filename: data.filename,
                originalName: data.filename,
                storageObject: objectName,
                mimeType: data.mimetype,
                fileSize: buffer.length,
                status: 'pending',
            });
            await doc.save();

            // Queue for processing
            await queues.addJob('document', 'process-document', {
                documentId: doc._id.toString(),
                objectName,
                mimetype: data.mimetype,
            });

            return {
                success: true,
                document: {
                    id: doc._id,
                    filename: doc.filename,
                    type: doc.type,
                    status: doc.status,
                },
            };
        } catch (err) {
            app.log.error('Document upload error:', err);
            reply.code(500);
            return { error: err.message };
        }
    });

    /**
     * List user's documents
     * GET /api/documents
     */
    app.get('/api/documents', { preHandler: authenticate }, async (request, reply) => {
        try {
            const { type, status } = request.query;
            const filter = { userId: request.user.userId };

            if (type) filter.type = type;
            if (status) filter.status = status;

            const documents = await Document.find(filter)
                .sort({ createdAt: -1 })
                .select('-text -chunks');

            return {
                success: true,
                documents: documents.map(d => ({
                    id: d._id,
                    filename: d.filename,
                    type: d.type,
                    status: d.status,
                    fileSize: d.fileSize,
                    createdAt: d.createdAt,
                    updatedAt: d.updatedAt,
                })),
            };
        } catch (err) {
            reply.code(500);
            return { error: err.message };
        }
    });

    /**
     * Get document by ID
     * GET /api/documents/:id
     */
    app.get('/api/documents/:id', { preHandler: authenticate }, async (request, reply) => {
        try {
            const { id } = request.params;
            const doc = await Document.findOne({ _id: id, userId: request.user.userId });

            if (!doc) {
                reply.code(404);
                return { error: 'Document not found' };
            }

            return { success: true, document: doc };
        } catch (err) {
            reply.code(500);
            return { error: err.message };
        }
    });

    /**
     * Delete document
     * DELETE /api/documents/:id
     */
    app.delete('/api/documents/:id', { preHandler: authenticate }, async (request, reply) => {
        try {
            const { id } = request.params;
            const doc = await Document.findOne({ _id: id, userId: request.user.userId });

            if (!doc) {
                reply.code(404);
                return { error: 'Document not found' };
            }

            // Delete from MinIO
            try {
                await minio.removeObject(doc.storageObject);
            } catch (err) {
                app.log.warn('Failed to delete from MinIO:', err);
            }

            // Delete vectors from Qdrant
            if (doc.embeddingIds?.length > 0) {
                try {
                    await app.qdrant.delete('documents', {
                        wait: true,
                        points: doc.embeddingIds,
                    });
                } catch (err) {
                    app.log.warn('Failed to delete from Qdrant:', err);
                }
            }

            await Document.deleteOne({ _id: id });

            return { success: true };
        } catch (err) {
            reply.code(500);
            return { error: err.message };
        }
    });

    /**
     * Search documents
     * POST /api/documents/search
     */
    app.post('/api/documents/search', { preHandler: authenticate }, async (request, reply) => {
        try {
            const { query, type } = request.body;

            if (!query) {
                reply.code(400);
                return { error: 'Query is required' };
            }

            // Simple text search for now
            const filter = { userId: request.user.userId, text: { $regex: query, $options: 'i' } };
            if (type) filter.type = type;

            const documents = await Document.find(filter)
                .limit(10)
                .select('filename type text createdAt');

            return {
                success: true,
                results: documents.map(d => ({
                    id: d._id,
                    filename: d.filename,
                    type: d.type,
                    snippet: d.text?.substring(0, 200) + '...',
                    createdAt: d.createdAt,
                })),
            };
        } catch (err) {
            reply.code(500);
            return { error: err.message };
        }
    });
}
