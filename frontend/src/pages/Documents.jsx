import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimatedPage from '../components/AnimatedPage';
import AnimatedBackground from '../components/AnimatedBackground';
import GlassCard from '../components/GlassCard';
import LoadingSpinner from '../components/LoadingSpinner';
import Badge from '../components/Badge';
import Card from '../components/Card';
import Button from '../components/Button';
import { api } from '../services/api';
import { toast } from 'sonner';

export default function Documents() {
    const [resumes, setResumes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('Please login to view documents');
            navigate('/login');
            return;
        }
        loadResumes();
    }, [navigate]);

    const loadResumes = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }
        
        try {
            setLoading(true);
            setError('');
            console.log('Loading resumes with token:', token ? 'Present' : 'Missing');
            // Fetch resumes from the Resume API (not Document API)
            const data = await api.get('/api/resume/list', token);
            console.log('Resumes loaded:', data);
            setResumes(data.resumes || []);
        } catch (err) {
            console.error('Failed to load resumes:', err);
            setError('Failed to load resumes: ' + err.message);
            if (err.message.includes('401') || err.message.includes('Unauthorized')) {
                toast.error('Session expired. Please login again.');
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('Please login to upload resumes');
            navigate('/login');
            return;
        }

        // Validate file type
        const validTypes = ['.pdf', '.doc', '.docx', '.txt'];
        const fileExt = '.' + file.name.split('.').pop().toLowerCase();
        if (!validTypes.includes(fileExt)) {
            toast.error('Invalid file type. Please upload PDF, DOC, DOCX, or TXT files.');
            e.target.value = '';
            return;
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error('File too large. Maximum size is 10MB.');
            e.target.value = '';
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            setUploading(true);
            setError('');
            toast.loading('Uploading resume...', { id: 'upload' });
            
            console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);
            const data = await api.upload('/api/resume/upload', formData, token);
            console.log('Upload response:', data);
            
            if (data.id) {
                toast.success('Resume uploaded successfully! Processing...', { id: 'upload' });
                await loadResumes();
                e.target.value = ''; // Reset file input
            } else {
                throw new Error('Upload failed - no ID returned');
            }
        } catch (err) {
            console.error('Upload error:', err);
            const errorMsg = err.message || 'Upload failed';
            toast.error(errorMsg, { id: 'upload' });
            setError('Upload failed: ' + errorMsg);
            
            if (err.message.includes('401') || err.message.includes('Unauthorized')) {
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                navigate('/login');
            }
        } finally {
            setUploading(false);
        }
    };

    const deleteResume = async (id) => {
        if (!confirm('Delete this resume?')) return;
        
        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('Please login to delete resumes');
            navigate('/login');
            return;
        }
        
        try {
            toast.loading('Deleting resume...', { id: 'delete' });
            await api.delete(`/api/resume/${id}`, token);
            toast.success('Resume deleted successfully', { id: 'delete' });
            await loadResumes();
        } catch (err) {
            toast.error('Failed to delete resume', { id: 'delete' });
            setError('Failed to delete resume: ' + err.message);
        }
    };

    const handleChat = (resumeId) => {
        console.log('Navigating to chat with resumeId:', resumeId);
        navigate(`/chat?resumeId=${resumeId}`);
    };

    const handleAnalysis = (resumeId) => {
        console.log('Navigating to analysis with resumeId:', resumeId);
        navigate(`/analysis?resumeId=${resumeId}`);
    };

    const handleViewResume = async (resumeId) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                toast.error('Please login to view resume');
                navigate('/login');
                return;
            }

            const resume = resumes.find(r => r.id === resumeId);
            if (resume && resume.filename) {
                // Open resume in new tab with full backend URL and auth token
                const backendUrl = 'http://localhost:3001';
                window.open(`${backendUrl}/api/resume/${resumeId}/download?token=${token}`, '_blank');
            }
        } catch (err) {
            console.error('View resume error:', err);
            toast.error('Failed to open resume');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'ready': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'processing': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
        }
    };

    const filteredResumes = resumes.filter(resume =>
        resume.filename.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="app-background relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-slate bg-grid-16 opacity-30 dark:opacity-10 pointer-events-none" />
            <AnimatedBackground />
            <AnimatedPage>
                <div className="max-w-7xl mx-auto pt-14 px-4 pb-20 relative z-10">
                    <div className="mb-8 animate-slide-in-up">
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-brand-500 to-purple-500 bg-clip-text text-transparent">
                                Resume Library
                            </h1>
                            <Badge variant="primary" size="md">
                                {resumes.length} {resumes.length === 1 ? 'Resume' : 'Resumes'}
                            </Badge>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 mt-2 text-lg">
                            Manage your resumes and start AI-powered analysis
                        </p>
                    </div>

                    {/* Controls */}
                    <GlassCard hover glow className="p-6 mb-6 animate-slide-in-up" style={{ animationDelay: '0.1s' }}>
                        <div className="flex flex-wrap gap-4 items-center">
                            {/* Upload */}
                            <label className="cursor-pointer">
                                <Button as="span" disabled={uploading} size="md" className="flex items-center gap-2">
                                    {uploading ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                            Upload Resume
                                        </>
                                    )}
                                </Button>
                                <input
                                    type="file"
                                    onChange={handleUpload}
                                    className="hidden"
                                    accept=".pdf,.doc,.docx,.txt"
                                    disabled={uploading}
                                />
                            </label>

                            {/* Search */}
                            <div className="flex-1 min-w-[250px]">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="🔍 Search resumes..."
                                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>
                    </GlassCard>

                    {error && (
                        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-lg border border-red-300 dark:border-red-700">
                            {error}
                        </div>
                    )}

                    {/* Resumes Table/List */}
                    {loading ? (
                        <div className="text-center py-20">
                            <LoadingSpinner size="xl" text="Loading your documents..." />
                        </div>
                    ) : filteredResumes.length === 0 ? (
                        <GlassCard hover className="p-12 text-center animate-scale-in">
                            <div className="text-7xl mb-4 animate-bounce">📄</div>
                            <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-slate-100">No resumes found</h3>
                            <p className="text-lg text-slate-600 dark:text-slate-400">Upload your first resume to get started with AI-powered analysis</p>
                        </GlassCard>
                    ) : (
                        <GlassCard hover className="overflow-hidden animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                                Document
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                                Date
                                            </th>
                                            <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {filteredResumes.map((resume) => (
                                            <tr key={resume.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-2xl">📄</span>
                                                        <div>
                                                            <p className="font-medium text-slate-900 dark:text-slate-100">
                                                                {resume.filename}
                                                            </p>
                                                            {resume.summary && (
                                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                                                                    {resume.summary.substring(0, 60)}...
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(resume.status)}`}>
                                                        {resume.status === 'ready' && '✓ '}
                                                        {resume.status === 'processing' && '⏳ '}
                                                        {resume.status === 'error' && '✕ '}
                                                        {resume.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                    {new Date(resume.createdAt).toLocaleDateString('en-US', { 
                                                        month: 'short', 
                                                        day: 'numeric', 
                                                        year: 'numeric' 
                                                    })}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleChat(resume.id)}
                                                            disabled={resume.status !== 'ready'}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-40"
                                                            title="Chat with AI"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleAnalysis(resume.id)}
                                                            disabled={resume.status !== 'ready'}
                                                            className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors disabled:opacity-40"
                                                            title="Analyze Resume"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleViewResume(resume.id)}
                                                            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                                            title="View Resume"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => deleteResume(resume.id)}
                                                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                            title="Delete Resume"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-700">
                                {filteredResumes.map((resume) => (
                                    <div key={resume.id} className="p-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3 flex-1">
                                                <span className="text-2xl">📄</span>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                                                        {resume.filename}
                                                    </h3>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                        {new Date(resume.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(resume.status)}`}>
                                                {resume.status}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={() => handleChat(resume.id)}
                                                disabled={resume.status !== 'ready'}
                                                className="flex-1 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                💬 Chat
                                            </button>
                                            <button
                                                onClick={() => handleAnalysis(resume.id)}
                                                disabled={resume.status !== 'ready'}
                                                className="flex-1 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                📊 Analyze
                                            </button>
                                            <button
                                                onClick={() => handleViewResume(resume.id)}
                                                className="px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-sm font-medium"
                                            >
                                                👁️ View
                                            </button>
                                            <button
                                                onClick={() => deleteResume(resume.id)}
                                                className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium"
                                            >
                                                🗑️ Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </GlassCard>
                    )}
                </div>
            </AnimatedPage>
        </div>
    );
}
