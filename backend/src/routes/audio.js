import axios from 'axios';

export async function audioRoutes(app) {
    // TTS: Generate audio from text
    app.post('/tts', async (req, reply) => {
        const { text, voice = 'en-US' } = req.body || {};
        if (!text) return reply.code(400).send({ error: 'text required' });

        // If TTS_URL is configured with an API key, use it (OpenAI, ElevenLabs, etc.)
        if (process.env.TTS_URL && process.env.OPENAI_API_KEY) {
            try {
                const response = await axios.post(
                    process.env.TTS_URL,
                    {
                        model: 'tts-1',
                        input: text,
                        voice: 'alloy',
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        responseType: 'stream',
                    }
                );
                reply.header('Content-Type', 'audio/mpeg');
                return reply.send(response.data);
            } catch (e) {
                app.log.error(e);
                // Fall through to client-side fallback
            }
        }

        // Return instruction for client-side Web Speech API fallback
        return reply.code(200).send({
            useBrowserTTS: true,
            text,
            voice,
            message: 'Use browser Web Speech API for TTS. Set OPENAI_API_KEY for cloud TTS.',
        });
    });

    // TTS synthesize endpoint (alias for /tts) for frontend compatibility
    app.post('/synthesize', async (req, reply) => {
        const { text, voice = 'en-US' } = req.body || {};
        if (!text) return reply.code(400).send({ error: 'text required' });

        // If TTS_URL is configured with an API key, use it (OpenAI, ElevenLabs, etc.)
        if (process.env.TTS_URL && process.env.OPENAI_API_KEY) {
            try {
                const response = await axios.post(
                    process.env.TTS_URL,
                    {
                        model: 'tts-1',
                        input: text,
                        voice: 'alloy',
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        responseType: 'stream',
                    }
                );
                reply.header('Content-Type', 'audio/mpeg');
                return reply.send(response.data);
            } catch (e) {
                app.log.error(e);
                // Fall through to client-side fallback
            }
        }

        // Return instruction for client-side Web Speech API fallback
        return reply.code(200).send({
            useBrowserTTS: true,
            text,
            voice,
            message: 'Use browser Web Speech API for TTS. Set OPENAI_API_KEY for cloud TTS.',
        });
    });

    // STT: Transcribe audio to text
    app.post('/stt', async (req, reply) => {
        const file = await req.file();
        if (!file) return reply.code(400).send({ error: 'audio file required' });

        // If STT_URL is configured with an API key, use it (OpenAI Whisper, AssemblyAI, etc.)
        if (process.env.STT_URL && process.env.OPENAI_API_KEY) {
            try {
                const FormData = (await import('form-data')).default;
                const form = new FormData();
                form.append('file', file.file, {
                    filename: file.filename || 'audio.webm',
                    contentType: file.mimetype || 'audio/webm',
                });
                form.append('model', 'whisper-1');

                const { data } = await axios.post(process.env.STT_URL, form, {
                    headers: {
                        ...form.getHeaders(),
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    },
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                });
                return { text: data.text };
            } catch (e) {
                app.log.error(e);
                return reply.code(503).send({ error: 'STT service error', details: e.message });
            }
        }

        // Return instruction for client-side Web Speech API fallback
        return reply.code(200).send({
            useBrowserSTT: true,
            message: 'Use browser Web Speech API for STT. Set OPENAI_API_KEY for cloud STT.',
        });
    });
}
