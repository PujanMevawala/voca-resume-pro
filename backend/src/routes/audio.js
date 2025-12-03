import axios from 'axios';
import textToSpeech from '@google-cloud/text-to-speech';
import { promisify } from 'util';

// Initialize Google Cloud TTS client (only if credentials are available)
let ttsClient = null;
try {
    if (process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.log('🔧 Initializing Google Cloud TTS...');
        console.log('   Project ID:', process.env.GOOGLE_CLOUD_PROJECT_ID);
        console.log('   Credentials path:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
        ttsClient = new textToSpeech.TextToSpeechClient();
        console.log('✅ Google Cloud TTS initialized successfully!');
    } else {
        console.log('⚠️  No Google Cloud credentials found');
    }
} catch (err) {
    console.error('❌ Google Cloud TTS initialization failed:', err.message);
    console.warn('   Will use browser fallback');
}

export async function audioRoutes(app) {
    // TTS: Generate audio from text
    app.post('/tts', async (req, reply) => {
        const { text, voice = 'en-US' } = req.body || {};
        if (!text) return reply.code(400).send({ error: 'text required' });

        // Try Google Cloud TTS first (4M chars/month free)
        if (ttsClient) {
            try {
                const request = {
                    input: { text },
                    voice: {
                        languageCode: voice.includes('-') ? voice : 'en-US',
                        name: voice.includes('-') ? `${voice}-Neural2-C` : 'en-US-Neural2-C',
                    },
                    audioConfig: {
                        audioEncoding: 'MP3',
                        speakingRate: 1.0,
                        pitch: 0,
                    },
                };

                const [response] = await ttsClient.synthesizeSpeech(request);

                if (response.audioContent) {
                    reply.header('Content-Type', 'audio/mpeg');
                    reply.header('X-TTS-Provider', 'google-cloud');
                    console.log('✅ Google Cloud TTS: Returning audio (' + response.audioContent.length + ' bytes)');
                    return reply.send(Buffer.from(response.audioContent));
                }
            } catch (error) {
                console.error('❌ Google Cloud TTS error (synthesize endpoint):', error.message);
                console.error('   Error details:', error);
                app.log.error('Google Cloud TTS error:', error);
                // Fall through to next option
            }
        }

        // Try OpenAI TTS as secondary option (if configured)
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
                reply.header('X-TTS-Provider', 'openai');
                return reply.send(response.data);
            } catch (e) {
                app.log.error('OpenAI TTS error:', e.message);
                // Fall through to browser fallback
            }
        }

        // Fallback to client-side Web Speech API
        return reply.code(200).send({
            useBrowserTTS: true,
            text,
            voice,
            message: 'Using browser Web Speech API. Configure Google Cloud TTS for better quality.',
        });
    });

    // TTS synthesize endpoint (alias for /tts) for frontend compatibility
    app.post('/synthesize', async (req, reply) => {
        const { text, voice = 'en-US' } = req.body || {};
        if (!text) return reply.code(400).send({ error: 'text required' });

        // Try Google Cloud TTS first
        if (ttsClient) {
            try {
                const request = {
                    input: { text },
                    voice: {
                        languageCode: voice.includes('-') ? voice : 'en-US',
                        name: voice.includes('-') ? `${voice}-Neural2-C` : 'en-US-Neural2-C',
                    },
                    audioConfig: {
                        audioEncoding: 'MP3',
                        speakingRate: 1.0,
                        pitch: 0,
                    },
                };

                const [response] = await ttsClient.synthesizeSpeech(request);

                if (response.audioContent) {
                    reply.header('Content-Type', 'audio/mpeg');
                    reply.header('X-TTS-Provider', 'google-cloud');
                    return reply.send(Buffer.from(response.audioContent));
                }
            } catch (error) {
                app.log.error('Google Cloud TTS error:', error.message);
                // Fall through to next option
            }
        }

        // Try OpenAI TTS as secondary option
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
                reply.header('X-TTS-Provider', 'openai');
                return reply.send(response.data);
            } catch (e) {
                app.log.error('OpenAI TTS error:', e.message);
                // Fall through to browser fallback
            }
        }

        // Fallback to client-side Web Speech API
        return reply.code(200).send({
            useBrowserTTS: true,
            text,
            voice,
            message: 'Using browser Web Speech API. Configure Google Cloud TTS for better quality.',
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
