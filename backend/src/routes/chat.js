import axios from 'axios';
import { Chat } from '../models/Chat.js';
import { authenticate } from '../middleware/auth.js';
import { chatWithContext } from '../services/llmService.js';

const LLM_URL = process.env.LLM_URL || 'http://localhost:11435';
const EMBEDDER_URL = process.env.EMBEDDER_URL || 'http://localhost:3003';

export async function registerChatRoutes(app) {
    const qdrant = app.qdrant;

    /**
     * Create new chat
     * POST /api/chat
     */
    app.post('/api/chat', { preHandler: authenticate }, async (request, reply) => {
        try {
            const { title } = request.body;
            const chat = new Chat({
                userId: request.user.userId,
                title: title || 'New Chat',
                messages: [],
            });
            await chat.save();
            return { success: true, chat };
        } catch (err) {
            app.log.error('Create chat error:', err);
            reply.code(500);
            return { error: err.message };
        }
    });

    /**
     * List user's chats
     * GET /api/chat
     */
    app.get('/api/chat', { preHandler: authenticate }, async (request, reply) => {
        try {
            const chats = await Chat.find({ userId: request.user.userId })
                .sort({ updatedAt: -1 })
                .limit(50)
                .select('title messages updatedAt');

            return {
                success: true,
                chats: chats.map(c => ({
                    id: c._id,
                    title: c.title,
                    lastMessage: c.messages[c.messages.length - 1]?.content || '',
                    messageCount: c.messages.length,
                    updatedAt: c.updatedAt,
                })),
            };
        } catch (err) {
            reply.code(500);
            return { error: err.message };
        }
    });

    /**
     * Get chat by ID
     * GET /api/chat/:id
     */
    app.get('/api/chat/:id', { preHandler: authenticate }, async (request, reply) => {
        try {
            const { id } = request.params;
            const chat = await Chat.findOne({ _id: id, userId: request.user.userId });

            if (!chat) {
                reply.code(404);
                return { error: 'Chat not found' };
            }

            return { success: true, chat };
        } catch (err) {
            reply.code(500);
            return { error: err.message };
        }
    });

    /**
     * Send message with RAG context
     * POST /api/chat/:id/message
     */
    app.post('/api/chat/:id/message', { preHandler: authenticate }, async (request, reply) => {
        try {
            const { id } = request.params;
            const { message, model } = request.body;

            if (!message) {
                reply.code(400);
                return { error: 'Message is required' };
            }

            const chat = await Chat.findOne({ _id: id, userId: request.user.userId });
            if (!chat) {
                reply.code(404);
                return { error: 'Chat not found' };
            }

            // Embed user question and search for context
            let contextChunks = [];
            try {
                const embeddingResponse = await axios.post(`${EMBEDDER_URL}/embed`, { text: message }, { timeout: 5000 });
                const embedding = embeddingResponse.data.embedding;

                // Search across all user's vectors
                const collections = ['resumes', 'documents', 'transcripts'];

                for (const collection of collections) {
                    try {
                        const searchResults = await qdrant.search(collection, {
                            vector: embedding,
                            limit: 3,
                            filter: {
                                must: [{ key: 'userId', match: { value: String(request.user.userId) } }],
                            },
                        });
                        contextChunks.push(...searchResults.map(r => r.payload.chunk));
                    } catch (err) {
                        // Collection might not exist yet
                    }
                }
            } catch (embeddingError) {
                app.log.warn('Embedder service unavailable, proceeding without RAG context:', embeddingError.message);
            }



            // Build context
            const context = contextChunks.slice(0, 5).join('\n\n');

            // Build chat history
            const history = chat.messages.slice(-5).map(m => ({
                role: m.role,
                content: m.content,
            }));

            // Add current message
            history.push({
                role: 'user',
                content: message,
            });

            // Call LLM with fallback
            let assistantMessage;
            let usedModel = model;
            try {
                const result = await chatWithContext({
                    messages: history,
                    context: contextChunks.length > 0 ? context : '',
                    model,
                    temperature: 0.7,
                });

                assistantMessage = result.response;
                usedModel = result.model;
            } catch (llmError) {
                app.log.error('LLM service unavailable:', llmError.message);
                assistantMessage = 'I apologize, but the AI service is currently unavailable. Please try again later or ensure all services are running.';
            }

            // Save messages
            chat.messages.push({
                role: 'user',
                content: message,
                timestamp: new Date(),
            });
            chat.messages.push({
                role: 'assistant',
                content: assistantMessage,
                timestamp: new Date(),
                metadata: {
                    model: usedModel,
                    contextDocs: contextChunks.slice(0, 5),
                },
            });

            await chat.save();

            return {
                success: true,
                response: assistantMessage,
                context: contextChunks.length > 0,
                metadata: {
                    model: llmResponse.data.model || model,
                    contextDocs: contextChunks.slice(0, 5),
                },
            };
        } catch (err) {
            app.log.error('Chat message error:', err);
            reply.code(500);
            return { error: err.message };
        }
    });

    /**
     * Stream chat response
     * POST /api/chat/:id/stream
     */
    app.post('/api/chat/:id/stream', { preHandler: authenticate }, async (request, reply) => {
        try {
            const { id } = request.params;
            const { message } = request.body;

            const chat = await Chat.findOne({ _id: id, userId: request.user.userId });
            if (!chat) {
                reply.code(404);
                return { error: 'Chat not found' };
            }

            // Get context (same as above)
            const embeddingResponse = await axios.post(`${EMBEDDER_URL}/embed`, { text: message });
            const embedding = embeddingResponse.data.embedding;

            const collections = ['resumes', 'documents', 'transcripts'];
            let contextChunks = [];

            for (const collection of collections) {
                try {
                    const searchResults = await qdrant.search(collection, {
                        vector: embedding,
                        limit: 3,
                        filter: {
                            must: [{ key: 'userId', match: { value: String(request.user.userId) } }],
                        },
                    });
                    contextChunks.push(...searchResults.map(r => r.payload.chunk));
                } catch (err) { }
            }

            const context = contextChunks.slice(0, 5).join('\n\n');
            const systemPrompt = `You are a helpful AI assistant. Use the following context from the user's documents to answer questions accurately.

Context:
${context}`;

            // Stream response
            reply.raw.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            });

            const streamResponse = await axios.post(
                `${LLM_URL}/generate`,
                {
                    prompt: message,
                    system: systemPrompt,
                    stream: true,
                },
                { responseType: 'stream' }
            );

            let fullResponse = '';

            streamResponse.data.on('data', (chunk) => {
                try {
                    const data = JSON.parse(chunk.toString());
                    if (data.token) {
                        fullResponse += data.token;
                        reply.raw.write(`data: ${JSON.stringify({ token: data.token })}\n\n`);
                    }
                } catch (err) { }
            });

            streamResponse.data.on('end', async () => {
                // Save messages
                chat.messages.push({ role: 'user', content: message, timestamp: new Date() });
                chat.messages.push({ role: 'assistant', content: fullResponse, timestamp: new Date() });
                await chat.save();

                reply.raw.write('data: [DONE]\n\n');
                reply.raw.end();
            });

        } catch (err) {
            app.log.error('Stream error:', err);
            reply.code(500);
            return { error: err.message };
        }
    });

    /**
     * Delete chat
     * DELETE /api/chat/:id
     */
    app.delete('/api/chat/:id', { preHandler: authenticate }, async (request, reply) => {
        try {
            const { id } = request.params;
            await Chat.deleteOne({ _id: id, userId: request.user.userId });
            return { success: true };
        } catch (err) {
            reply.code(500);
            return { error: err.message };
        }
    });
}
