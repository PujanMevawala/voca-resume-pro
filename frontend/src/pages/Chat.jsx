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
                        <div className="glass rounded-2xl p-4 mb-4 border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                            AI Chat Assistant
                                        </h1>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                                            {resumeInfo?.filename || 'Loading...'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <select
                                        value={selectedModel}
                                        onChange={(e) => setSelectedModel(e.target.value)}
                                        className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
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
                                        size="sm"
                                        onClick={() => navigate('/documents')}
                                    >
                                        ← Back to Docs
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
                        <div className="glass rounded-2xl flex-1 overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700 shadow-xl">
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
                                {messages.length === 0 && !processing && (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="text-center py-12 px-6 max-w-md">
                                            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 flex items-center justify-center">
                                                <svg className="w-10 h-10 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                </svg>
                                            </div>
                                            <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-slate-100">
                                                Start a Conversation
                                            </h3>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                                Ask questions about your resume and get AI-powered insights instantly
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {messages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                                    >
                                        {/* Avatar */}
                                        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                                            msg.role === 'user'
                                                ? 'bg-gradient-to-br from-brand-500 to-purple-600'
                                                : 'bg-gradient-to-br from-slate-600 to-slate-700 dark:from-slate-700 dark:to-slate-800'
                                        }`}>
                                            {msg.role === 'user' ? (
                                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
                                                </svg>
                                            )}
                                        </div>
                                        
                                        {/* Message Bubble */}
                                        <div className={`flex-1 max-w-[75%] ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                            <div className={`inline-block rounded-2xl px-4 py-3 shadow-sm ${
                                                msg.role === 'user'
                                                    ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white'
                                                    : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700'
                                            }`}>
                                                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                                                {msg.sources && msg.sources.length > 0 && (
                                                    <div className="mt-3 pt-3 border-t border-slate-300 dark:border-slate-600">
                                                        <div className="flex items-center gap-2 text-xs opacity-75">
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                                            </svg>
                                                            <span>{msg.sources.length} sources referenced</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 px-2">
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))}

                                {loading && (
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
                                            </svg>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 shadow-sm border border-slate-200 dark:border-slate-700">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-brand-500 animate-bounce"></div>
                                                <div className="w-2 h-2 rounded-full bg-brand-500 animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                                <div className="w-2 h-2 rounded-full bg-brand-500 animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Form */}
                            <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                                <form onSubmit={sendMessage} className="flex items-center gap-3">
                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder={processing ? 'Please wait...' : 'Type your message...'}
                                            disabled={loading || processing}
                                            className="w-full pl-4 pr-12 py-3.5 border-2 border-slate-300 dark:border-slate-600 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                                            {input.length}/500
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading || processing || !input.trim()}
                                        className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 disabled:from-slate-400 disabled:to-slate-500 text-white shadow-lg hover:shadow-xl disabled:shadow-none transition-all duration-200 flex items-center justify-center group disabled:cursor-not-allowed"
                                    >
                                        <svg className="w-5 h-5 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </AnimatedPage>
        </div>
    );
}
