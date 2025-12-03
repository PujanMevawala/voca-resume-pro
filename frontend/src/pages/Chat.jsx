import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AnimatedPage from '../components/AnimatedPage';
import Button from '../components/Button';
import { api } from '../services/api';
import { toast } from 'sonner';

export default function Chat() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const resumeId = searchParams.get('resumeId');
    
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [processingStage, setProcessingStage] = useState('');
    const [resumeInfo, setResumeInfo] = useState(null);
    const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');
    const [availableModels] = useState([
        { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Groq)', provider: 'groq' },
        { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Fast (Groq)', provider: 'groq' },
        { id: 'qwen/qwen3-32b', name: 'Qwen 3 32B (Groq)', provider: 'groq' },
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google' },
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'google' },
    ]);
    const messagesEndRef = useRef(null);
    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!resumeId) {
            toast.error('No resume selected');
            navigate('/documents');
            return;
        }
        if (!token) {
            navigate('/login');
            return;
        }
        loadResumeInfo();
        initializeRAG();
    }, [resumeId, token, navigate]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadResumeInfo = async () => {
        try {
            const data = await api.get(`/api/resume/${resumeId}`, token);
            setResumeInfo(data);
        } catch (err) {
            toast.error('Failed to load resume information');
            console.error(err);
        }
    };

    const initializeRAG = async () => {
        try {
            setProcessing(true);
            setProcessingStage('Initializing RAG system...');
            
            // Check if RAG is already initialized
            const checkData = await api.get(`/api/chat/rag/status/${resumeId}`, token);
            
            if (checkData.initialized) {
                toast.success('Resume ready for chat!');
                setProcessing(false);
                return;
            }

            // Initialize RAG pipeline
            setProcessingStage('📄 Reading document text...');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            setProcessingStage('✂️ Parsing and chunking text...');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            setProcessingStage('🧠 Creating embeddings...');
            const ragData = await api.post('/api/chat/rag/initialize', { resumeId }, token);
            
            setProcessingStage('💾 Storing vectors in database...');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            if (ragData.success) {
                toast.success('RAG system initialized! Ready to chat.');
                setProcessing(false);
            } else {
                throw new Error('RAG initialization failed');
            }
        } catch (err) {
            toast.error('Failed to initialize chat system: ' + err.message);
            setProcessing(false);
            console.error(err);
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading || processing) return;

        const userMessage = { 
            role: 'user', 
            content: input, 
            timestamp: new Date().toISOString() 
        };
        
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const data = await api.post('/api/chat/query', {
                resumeId,
                query: userMessage.content,
                model: selectedModel,
            }, token);

            if (data.success && data.response) {
                const assistantMessage = {
                    role: 'assistant',
                    content: data.response,
                    timestamp: new Date().toISOString(),
                    sources: data.sources || [],
                    context: data.context || []
                };
                setMessages(prev => [...prev, assistantMessage]);
            } else {
                throw new Error('No response received');
            }
        } catch (err) {
            toast.error('Failed to get response: ' + err.message);
            setMessages(prev => prev.slice(0, -1)); // Remove user message on error
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-background">
            <div className="absolute inset-0 bg-grid-slate bg-grid-16 opacity-30 dark:opacity-10 pointer-events-none" />
            <AnimatedPage>
                <div className="max-w-6xl mx-auto pt-14 px-4 pb-4">
                    <div className="flex flex-col h-[calc(100vh-8rem)]">
                        {/* Header */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <div>
                                    <h1 className="text-2xl font-bold bg-gradient-to-r from-brand-500 to-purple-500 bg-clip-text text-transparent">
                                        AI Chat Assistant
                                    </h1>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                        {resumeInfo?.filename || 'Loading...'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <select
                                        value={selectedModel}
                                        onChange={(e) => setSelectedModel(e.target.value)}
                                        className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500"
                                        disabled={loading || processing}
                                    >
                                        {availableModels.map(model => (
                                            <option key={model.id} value={model.id}>
                                                {model.name}
                                            </option>
                                        ))}
                                    </select>
                                    <Button
                                        variant="secondary"
                                        onClick={() => navigate('/documents')}
                                    >
                                        ← Back
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Processing Indicator */}
                        {processing && (
                            <div className="glass rounded-xl p-6 mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-200 border-t-brand-600"></div>
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-slate-100">
                                            Preparing your document for AI chat...
                                        </p>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                            {processingStage}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Chat Messages */}
                        <div className="glass rounded-xl flex-1 overflow-hidden flex flex-col">
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {messages.length === 0 && !processing && (
                                    <div className="text-center py-12">
                                        <div className="text-5xl mb-4">💬</div>
                                        <h3 className="text-lg font-semibold mb-2 text-slate-700 dark:text-slate-300">
                                            Start a conversation
                                        </h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            Ask questions about your resume and get AI-powered insights
                                        </p>
                                    </div>
                                )}

                                {messages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                                                msg.role === 'user'
                                                    ? 'bg-brand-600 text-white'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                                            }`}
                                        >
                                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                            {msg.sources && msg.sources.length > 0 && (
                                                <div className="mt-2 pt-2 border-t border-slate-300 dark:border-slate-600">
                                                    <p className="text-xs opacity-75">
                                                        📚 Sources: {msg.sources.length} document chunks
                                                    </p>
                                                </div>
                                            )}
                                            <p className="text-xs mt-1 opacity-70">
                                                {new Date(msg.timestamp).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}

                                {loading && (
                                    <div className="flex justify-start">
                                        <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="animate-bounce">●</div>
                                                <div className="animate-bounce delay-100">●</div>
                                                <div className="animate-bounce delay-200">●</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Form */}
                            <div className="border-t border-slate-200 dark:border-slate-700 p-4">
                                <form onSubmit={sendMessage} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder={processing ? 'Please wait...' : 'Ask a query...'}
                                        disabled={loading || processing}
                                        className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <Button
                                        type="submit"
                                        disabled={loading || processing || !input.trim()}
                                        size="md"
                                    >
                                        {loading ? '⏳' : '📤'} Send
                                    </Button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </AnimatedPage>
        </div>
    );
}
