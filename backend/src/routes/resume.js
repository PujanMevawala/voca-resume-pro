import { Resume } from '../models/Resume.js';
import { v4 as uuidv4 } from 'uuid';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { Readable } from 'stream';
import { generateResumeSummary, answerQuestion } from '../services/llmService.js';

export async function resumeRoutes(app) {
    const auth = async (req) => {
        try {
            await req.jwtVerify();
            return req.user;
        } catch {
            return null;
        }
    };

    app.post('/upload', async (req, reply) => {
        const user = await auth(req);
        if (!user) return reply.code(401).send({ error: 'Unauthorized' });

        const data = await req.file();
        if (!data) return reply.code(400).send({ error: 'No file' });
        const { filename, mimetype } = data;
        const userId = user.userId || user.sub;
        const objectName = `${userId}/${Date.now()}-${uuidv4()}-${filename}`;

        // Buffer the file for text extraction
        const chunks = [];
        for await (const chunk of data.file) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        // Upload to MinIO
        await app.minio.upload({
            objectName,
            stream: Readable.from([buffer]),
            size: buffer.length,
            contentType: mimetype,
        });

        // Extract text immediately for supported formats
        let text = '';
        let status = 'processing';

        try {
            if (mimetype === 'text/plain' || filename.endsWith('.txt')) {
                text = buffer.toString('utf-8');
                status = 'ready';
            } else if (mimetype === 'application/pdf' || filename.endsWith('.pdf')) {
                // Extract PDF text
                const pdfData = await pdf(buffer);
                text = pdfData.text || '';
                status = 'ready';
            } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || filename.endsWith('.docx')) {
                // Extract DOCX text
                const result = await mammoth.extractRawText({ buffer });
                text = result.value || '';
                status = 'ready';
            }
        } catch (err) {
            app.log.error('Text extraction error:', err);
            // Fall back to processing via queue
        }

        const resume = await Resume.create({
            userId,
            filename,
            storageObject: objectName,
            status,
            text: text || undefined
        });

        // Queue for processing if text extraction failed
        if (status === 'processing') {
            await app.queues.resumeQueue.add('process-resume', { resumeId: String(resume._id), objectName, mimetype });
        }

        return { id: resume._id, status: resume.status };
    });

    app.post('/summary', async (req, reply) => {
        const user = await auth(req);
        if (!user) return reply.code(401).send({ error: 'Unauthorized' });
        const { resumeId, regenerate } = req.body || {};
        const userId = user.userId || user.sub;
        const resume = await Resume.findOne({ _id: resumeId, userId });
        if (!resume) return reply.code(404).send({ error: 'Resume not found' });
        if (!resume.text) return reply.code(400).send({ error: 'Resume not processed yet' });

        // Return cached summary unless regenerate is requested
        if (resume.summary && !regenerate) return { summary: resume.summary };

        // Generate LLM-powered summary
        try {
            const summary = await generateResumeSummary({ resumeText: resume.text });
            resume.summary = summary;
            await resume.save();
            return { summary };
        } catch (error) {
            app.log.error('Summary generation failed:', error);
            return reply.code(500).send({ error: 'Summary generation failed', message: error.message });
        }
    });

    app.post('/query', async (req, reply) => {
        const user = await auth(req);
        if (!user) return reply.code(401).send({ error: 'Unauthorized' });
        const { resumeId, question } = req.body || {};
        if (!resumeId || !question) return reply.code(400).send({ error: 'resumeId and question required' });
        const userId = user.userId || user.sub;

        const resume = await Resume.findOne({ _id: resumeId, userId });
        if (!resume) return reply.code(404).send({ error: 'Resume not found' });
        if (!resume.text) return reply.code(400).send({ error: 'Resume not processed yet' });

        // Return direct answer using LLM instead of queueing
        try {
            const answer = await answerQuestion({ question, context: resume.text });
            return { question, answer };
        } catch (error) {
            app.log.error('Query failed:', error);
            return reply.code(500).send({ error: 'Query failed', message: error.message });
        }
    });

    // List all resumes for user
    app.get('/list', async (req, reply) => {
        const user = await auth(req);
        if (!user) return reply.code(401).send({ error: 'Unauthorized' });
        const userId = user.userId || user.sub;

        const resumes = await Resume.find({ userId })
            .sort({ createdAt: -1 })
            .select('filename status summary createdAt updatedAt');

        return {
            success: true,
            resumes: resumes.map(r => ({
                id: r._id,
                filename: r.filename,
                status: r.status,
                summary: r.summary,
                hasText: Boolean(r.text && r.text.length > 0),
                createdAt: r.createdAt,
                updatedAt: r.updatedAt,
            })),
        };
    });

    // Fetch resume status/details for polling in UI
    app.get('/:id', async (req, reply) => {
        const user = await auth(req);
        if (!user) return reply.code(401).send({ error: 'Unauthorized' });
        const { id } = req.params;
        const userId = user.userId || user.sub;
        const resume = await Resume.findOne({ _id: id, userId });
        if (!resume) return reply.code(404).send({ error: 'Resume not found' });
        return {
            id: resume._id,
            filename: resume.filename,
            status: resume.status,
            summary: resume.summary,
            hasText: Boolean(resume.text && resume.text.length > 0),
            updatedAt: resume.updatedAt,
        };
    });

    // Download/view resume
    app.get('/:id/download', async (req, reply) => {
        try {
            // Try to authenticate from header or query parameter
            let user;
            try {
                await req.jwtVerify();
                user = req.user;
            } catch {
                // If header auth fails, try query parameter
                const { token } = req.query;
                if (token) {
                    try {
                        const decoded = await req.server.jwt.verify(token);
                        user = decoded;
                    } catch (err) {
                        return reply.code(401).send({ error: 'Invalid token' });
                    }
                } else {
                    return reply.code(401).send({ error: 'Unauthorized' });
                }
            }

            const { id } = req.params;
            const resume = await Resume.findOne({ _id: id, userId: user.sub || user.userId });
            if (!resume) return reply.code(404).send({ error: 'Resume not found' });

            const stream = await app.minio.getStream(resume.storageObject);
            const contentType = resume.filename.endsWith('.pdf') ? 'application/pdf' :
                resume.filename.endsWith('.doc') ? 'application/msword' :
                    resume.filename.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
                        'text/plain';

            reply.header('Content-Type', contentType);
            reply.header('Content-Disposition', `inline; filename="${resume.filename}"`);
            return reply.send(stream);
        } catch (err) {
            app.log.error('Failed to download resume:', err);
            return reply.code(500).send({ error: 'Failed to retrieve resume file' });
        }
    });

    // Delete resume
    app.delete('/:id', async (req, reply) => {
        const user = await auth(req);
        if (!user) return reply.code(401).send({ error: 'Unauthorized' });
        const { id } = req.params;
        const userId = user.userId || user.sub;
        const resume = await Resume.findOne({ _id: id, userId });
        if (!resume) return reply.code(404).send({ error: 'Resume not found' });

        // Delete from MinIO
        try {
            await app.minio.removeObject(resume.storageObject);
        } catch (err) {
            app.log.warn('Failed to delete from MinIO:', err);
        }

        await Resume.deleteOne({ _id: id });
        return { success: true };
    });
}
