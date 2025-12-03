import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import AnimatedPage from '../components/AnimatedPage';
import Button from '../components/Button';
import { toast } from 'sonner';
import { api } from '../services/api';
import Gauge from '../components/Gauge';

export default function Analysis() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const resumeId = searchParams.get('resumeId');
  const token = localStorage.getItem('token');

  const [loading, setLoading] = useState(false);
  const [resumeInfo, setResumeInfo] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');
  const [availableModels] = useState([
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Groq)' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Fast (Groq)' },
    { id: 'qwen/qwen3-32b', name: 'Qwen 3 32B (Groq)' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
  ]);
  
  const [analysis, setAnalysis] = useState(null);
  const [jobFitScore, setJobFitScore] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioText, setAudioText] = useState('');
  const [speechUtterance, setSpeechUtterance] = useState(null);
  const [ttsProvider, setTtsProvider] = useState(null);
  const [audioRef, setAudioRef] = useState(null);

  useEffect(() => {
    if (!resumeId) {
      toast.error('No resume selected');
      navigate('/documents');
      return;
    }
    if (!token) {
      toast.error('Please login to access analysis');
      navigate('/login');
      return;
    }
    loadResumeInfo();
  }, [resumeId, token, navigate]);

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
      }
    };
  }, [audioUrl]);

  const loadResumeInfo = async () => {
    try {
      const data = await api.get(`/api/resume/${resumeId}`, token);
      setResumeInfo(data);
      if (data.status !== 'ready') {
        toast.warning('Resume is still processing. Please wait...');
      }
    } catch (err) {
      toast.error('Failed to load resume');
      console.error(err);
    }
  };

  const runAnalysis = async () => {
    if (!jobDescription.trim()) {
      toast.error('Please enter a job description');
      return;
    }

    setLoading(true);
    try {
      const data = await api.post('/api/analysis/comprehensive', {
        resumeId,
        jobDescription,
        model: selectedModel,
      }, token);

      if (data.success) {
        setAnalysis(data.analysis);
        setJobFitScore(data.jobFitScore);
        toast.success('Analysis complete!');
        setActiveTab('strengths');
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (err) {
      toast.error('Failed to run analysis: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateAudioSummary = async () => {
    if (!analysis) {
      toast.error('Please run analysis first');
      return;
    }

    setGeneratingAudio(true);
    try {
      // First, generate a summary script using LLM
      const scriptData = await api.post('/api/analysis/generate-script', {
        analysis,
        jobFitScore,
        model: selectedModel,
      }, token);

      console.log('Script data:', scriptData);

      // Check if script was generated
      if (!scriptData || !scriptData.script) {
        toast.error('Failed to generate script');
        return;
      }

      // Store the audio text for fallback
      setAudioText(scriptData.script);

      // Then, convert script to audio using TTS (Google Cloud TTS or browser fallback)
      const response = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:3001'}/api/audio/tts`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ text: scriptData.script, voice: 'en-US' }),
      });

      if (!response.ok) {
        throw new Error(`TTS failed: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      const ttsProvider = response.headers.get('x-tts-provider');
      
      console.log('TTS Provider:', ttsProvider);
      console.log('Content-Type:', contentType);

      // Check if we got audio (Google Cloud or OpenAI TTS)
      if (contentType && contentType.includes('audio')) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioUrl(audioUrl);
        setTtsProvider(ttsProvider);
        
        const providerName = ttsProvider === 'google-cloud' ? '🎙️ Google Cloud TTS' : 
                            ttsProvider === 'openai' ? '🤖 OpenAI TTS' : 
                            '🎵 High-Quality TTS';
        toast.success(`${providerName} - Audio ready!`);
        setActiveTab('summary');
      } else {
        // Browser TTS fallback
        const data = await response.json();
        if (data.useBrowserTTS) {
          setTtsProvider('browser');
          toast.success('🔊 Audio ready - Using browser speech (Click play to listen)');
          setActiveTab('summary');
        } else {
          toast.error('Unexpected response format');
        }
      }
    } catch (err) {
      console.error('Audio generation error:', err);
      toast.error('Failed to generate audio: ' + err.message);
    } finally {
      setGeneratingAudio(false);
    }
  };

  const playAudioSummary = () => {
    if (audioUrl && audioRef) {
      audioRef.play().catch(err => {
        console.error('Audio play error:', err);
        toast.error('Failed to play audio');
      });
      setIsPlayingAudio(true);
    } else if (audioText && 'speechSynthesis' in window) {
      // Fallback to Web Speech API for browser TTS
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
      
      const utterance = new SpeechSynthesisUtterance(audioText);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      // Get available voices
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Microsoft'));
      if (preferredVoice) utterance.voice = preferredVoice;
      
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => {
        setIsPlayingAudio(false);
        toast.error('Audio playback failed');
      };
      
      setSpeechUtterance(utterance);
      speechSynthesis.speak(utterance);
      setIsPlayingAudio(true);
    } else {
      toast.error('No audio available');
    }
  };

  const pauseAudioSummary = () => {
    if (audioUrl && audioRef) {
      audioRef.pause();
      setIsPlayingAudio(false);
    } else if ('speechSynthesis' in window && speechSynthesis.speaking) {
      speechSynthesis.pause();
      setIsPlayingAudio(false);
    }
  };

  const stopAudioSummary = () => {
    if (audioUrl && audioRef) {
      audioRef.pause();
      audioRef.currentTime = 0;
      setIsPlayingAudio(false);
    } else if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      setIsPlayingAudio(false);
      setSpeechUtterance(null);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview'},
    { id: 'strengths', label: 'Strengths/Weaknesses' },
    { id: 'suggestions', label: 'Improvements'},
    { id: 'interview', label: 'Interview Prep'},
    { id: 'jobfit', label: 'Job Fit Score'},
    { id: 'summary', label: 'Audio Summary'},
  ];

  return (
    <div className="app-background">
      <div className="absolute inset-0 bg-grid-slate bg-grid-16 opacity-30 dark:opacity-10 pointer-events-none" />
      <AnimatedPage>
        <div className="max-w-7xl mx-auto pt-14 px-4 pb-20">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-brand-500 to-purple-500 bg-clip-text text-transparent">
                  Resume Analysis
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  {resumeInfo?.filename || 'Loading...'}
                </p>
              </div>
              <Button variant="secondary" onClick={() => navigate('/documents')}>
                ← Back to Docs
              </Button>
            </div>
          </div>

          {/* Job Description Input */}
          <div className="glass rounded-2xl p-6 mb-6 border border-white/20">
            <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-slate-100">
              Job Description <span className="text-red-500">*</span>
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              Enter the job description to get tailored analysis, fit score, and interview questions
            </p>
            <textarea
              rows={8}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 p-4 outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-slate-900 dark:text-slate-100 backdrop-blur-sm transition-all"
              placeholder="Paste the complete job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
            
            <div className="flex items-center gap-4 mt-4 flex-wrap">
              <select value={selectedModel} onChange={(e) =>  setSelectedModel(e.target.value)} className="px-2 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all" disabled={loading}>
                {availableModels.map(model => ( 
                    <option key={model.id} value={model.id}>  
                        {model.name}  
                    </option> 
                ))}
              </select>

              <Button 
                onClick={runAnalysis} 
                disabled={loading || !jobDescription.trim() || resumeInfo?.status !== 'ready'} 
                size="sm"
              >
                {loading ? 'Analyzing...' : ' Analyze Resume'}
              </Button>

              {analysis && (
                <Button 
                  onClick={generateAudioSummary}
                  disabled={generatingAudio}
                  variant="secondary"
                  size="sm"
                >
                  {generatingAudio ? 'Generating...' : 'Generate Audio'}
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          {analysis && (
            <>
              <div className="flex flex-wrap gap-2 mb-6 glass rounded-2xl p-4 border border-white/20">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/30'
                        : 'bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="glass rounded-2xl p-8 border border-white/20">
                {activeTab === 'overview' && (
                  <div>
                    <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-100">Analysis Overview</h2>
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Summary</h3>
                        <p className="text-slate-700 dark:text-slate-300">{analysis.summaryInsights || 'Complete analysis generated'}</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-green-700 dark:text-green-300">{analysis.strengths?.length || 0}</div>
                          <div className="text-sm text-green-600 dark:text-green-400">Strengths Identified</div>
                        </div>
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{analysis.weaknesses?.length || 0}</div>
                          <div className="text-sm text-amber-600 dark:text-amber-400">Areas for Improvement</div>
                        </div>
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{analysis.interviewQuestions?.length || 0}</div>
                          <div className="text-sm text-purple-600 dark:text-purple-400">Interview Questions</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'strengths' && (
                  <div>
                    <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-slate-100">Strengths & Weaknesses</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">✓ Strengths</h3>
                          <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs font-semibold rounded-full">
                            {analysis.strengths?.length || 0}
                          </span>
                        </div>
                        <ul className="space-y-3">
                          {analysis.strengths?.map((strength, i) => (
                            <li key={i} className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                  {i + 1}
                                </span>
                                <p className="flex-1 text-slate-700 dark:text-slate-300">{strength}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-400">⚠ Areas for Improvement</h3>
                          <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-xs font-semibold rounded-full">
                            {analysis.weaknesses?.length || 0}
                          </span>
                        </div>
                        <ul className="space-y-3">
                          {analysis.weaknesses?.map((weakness, i) => (
                            <li key={i} className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                  {i + 1}
                                </span>
                                <p className="flex-1 text-slate-700 dark:text-slate-300">{weakness}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'suggestions' && (
                  <div>
                    <div className="flex items-center gap-2 mb-6">
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Improvement Suggestions</h2>
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs font-semibold rounded-full">
                        {analysis.suggestions?.length || 0}
                      </span>
                    </div>
                    <ul className="space-y-4">
                      {analysis.suggestions?.map((suggestion, i) => (
                        <li key={i} className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center text-lg font-bold">
                              {i + 1}
                            </div>
                            <div className="flex-1">
                              <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-md">{suggestion}</p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {activeTab === 'interview' && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Interview Preparation</h2>
                      <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 text-xs font-semibold rounded-full">
                        {analysis.interviewQuestions?.length || 0}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                      Practice these questions based on your resume and the job description
                    </p>
                    <div className="space-y-4">
                      {analysis.interviewQuestions?.map((item, i) => (
                        <div key={i} className="p-5 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-4">
                            <span className="flex-shrink-0 w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                              {i + 1}
                            </span>
                            <div className="flex-1">
                              <p className="font-medium text-slate-900 dark:text-slate-100 mb-2 text-md">
                                {item.question || item}
                              </p>
                              {item.hint && (
                                <p className="text-sm text-slate-600 dark:text-slate-400 italic mt-3 pl-3 border-l-2 border-purple-300 dark:border-purple-700">
                                  💡 Hint: {item.hint}
                                </p>
                              )}
                              {item.type && (
                                <span className="inline-block mt-3 px-3 py-1 bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100 text-xs font-semibold rounded-full">
                                  {item.type === 'technical' ? '🔧 Technical' : '👥 HR/Behavioral'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'jobfit' && (
                  <div>
                    <h2 className="text-2xl font-bold mb-6 text-center text-slate-900 dark:text-slate-100">Job Fit Score</h2>
                    {jobFitScore ? (
                      <div className="flex flex-col items-center">
                        <Gauge value={jobFitScore.score || 0} />
                        <div className="mt-6 max-w-2xl w-full p-5 bg-slate-50 dark:bg-slate-900/20 rounded-lg border border-slate-200 dark:border-slate-800">
                          <p className="text-center text-slate-700 dark:text-slate-300 leading-relaxed">
                            {jobFitScore.explanation}
                          </p>
                        </div>
                        
                        {jobFitScore.matchedSkills && jobFitScore.matchedSkills.length > 0 && (
                          <div className="mt-8 w-full p-6 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-2 mb-4">
                              <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">✓ Matched Skills</h3>
                              <span className="px-2 py-0.5 bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs font-semibold rounded-full">
                                {jobFitScore.matchedSkills.length}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {jobFitScore.matchedSkills.map((skill, i) => (
                                <span key={i} className="px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-sm rounded-full border border-green-300 dark:border-green-700 font-medium">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {jobFitScore.missingSkills && jobFitScore.missingSkills.length > 0 && (
                          <div className="mt-6 w-full p-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                            <div className="flex items-center gap-2 mb-4">
                              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">✕ Skills to Develop</h3>
                              <span className="px-2 py-0.5 bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 text-xs font-semibold rounded-full">
                                {jobFitScore.missingSkills.length}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {jobFitScore.missingSkills.map((skill, i) => (
                                <span key={i} className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-sm rounded-full border border-red-300 dark:border-red-700 font-medium">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-center text-slate-500 dark:text-slate-400">
                        Run analysis to see your job fit score
                      </p>
                    )}
                  </div>
                )}

                {activeTab === 'summary' && (
                  <div>
                    <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-slate-100">Audio Summary</h2>
                    {(audioUrl || audioText) ? (
                      <div className="space-y-6">
                        {/* Premium Audio Player Card */}
                        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 shadow-2xl">
                          
                          {/* Animated Background */}
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1),transparent_50%)]"></div>
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.1),transparent_40%)]"></div>
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(59,130,246,0.1),transparent_40%)]"></div>
                          
                          {/* Content */}
                          <div className="relative p-8 md:p-12">
                            
                            {/* Header with Provider Badge */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
                              <div>
                                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">
                                  Resume Analysis Audio
                                </h3>
                                <p className="text-slate-400 text-sm md:text-base">
                                  Professional narration of your resume analysis
                                </p>
                              </div>
                              {ttsProvider && (
                                <div className={`inline-flex items-center gap-3 px-5 py-3 rounded-full text-sm font-bold shadow-lg backdrop-blur-sm border ${
                                  ttsProvider === 'google-cloud' 
                                    ? 'bg-green-500/20 text-green-300 border-green-500/30' 
                                    : ttsProvider === 'openai'
                                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                    : 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                                }`}>
                                  <div className="relative flex h-3 w-3">
                                    <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></div>
                                    <div className="relative inline-flex rounded-full h-3 w-3 bg-current"></div>
                                  </div>
                                  <span>
                                    {ttsProvider === 'google-cloud' && 'Google Cloud Neural2'}
                                    {ttsProvider === 'openai' && 'OpenAI TTS'}
                                    {ttsProvider === 'browser' && 'Browser Speech'}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Audio Player Section */}
                            {audioUrl ? (
                              <div className="space-y-6">
                                
                                {/* Hidden Audio Element */}
                                <audio 
                                  ref={(el) => setAudioRef(el)}
                                  src={audioUrl}
                                  onPlay={() => setIsPlayingAudio(true)}
                                  onPause={() => setIsPlayingAudio(false)}
                                  onEnded={() => setIsPlayingAudio(false)}
                                  onTimeUpdate={(e) => {
                                    const progress = (e.target.currentTime / e.target.duration) * 100;
                                    const progressBar = document.getElementById('audio-progress');
                                    if (progressBar) progressBar.style.width = `${progress}%`;
                                  }}
                                  className="hidden"
                                />
                                
                                {/* Custom Audio Player */}
                                <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl p-8 border-2 border-slate-700/80 shadow-2xl overflow-hidden">
                                  
                                  {/* Glow Effects */}
                                  <div className="absolute -inset-1 bg-gradient-to-r from-brand-500 via-purple-500 to-pink-500 rounded-3xl blur-3xl opacity-20"></div>
                                  <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-purple-500/5"></div>
                                  
                                  {/* Waveform Visualization */}
                                  <div className="relative mb-6 bg-slate-900/40 rounded-2xl p-6 border border-slate-700/50">
                                    <div className="flex items-center justify-center gap-1 h-16">
                                      {[...Array(50)].map((_, i) => (
                                        <div
                                          key={i}
                                          className={`w-1 rounded-full transition-all duration-300 ${
                                            isPlayingAudio 
                                              ? 'bg-gradient-to-t from-brand-600 via-purple-500 to-pink-500' 
                                              : 'bg-slate-600'
                                          }`}
                                          style={{
                                            height: `${Math.random() * 60 + 20}%`,
                                            animation: isPlayingAudio ? `pulse ${Math.random() * 0.5 + 0.5}s ease-in-out infinite` : 'none',
                                            animationDelay: `${i * 0.02}s`
                                          }}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                  
                                  {/* Control Panel */}
                                  <div className="relative flex items-center gap-6 px-4">
                                    
                                    {/* Play/Pause Button */}
                                    <button
                                      onClick={() => {
                                        if (audioRef) {
                                          if (isPlayingAudio) {
                                            audioRef.pause();
                                          } else {
                                            audioRef.play().catch(err => {
                                              console.error('Play error:', err);
                                              toast.error('Failed to play audio');
                                            });
                                          }
                                        }
                                      }}
                                      className="relative flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 hover:from-brand-600 hover:to-purple-700 shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center group border-2 border-white/20"
                                    >
                                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent"></div>
                                      {isPlayingAudio ? (
                                        <svg className="w-7 h-7 text-white relative z-10" fill="currentColor" viewBox="0 0 24 24">
                                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                                        </svg>
                                      ) : (
                                        <svg className="w-7 h-7 text-white relative z-10 ml-1" fill="currentColor" viewBox="0 0 24 24">
                                          <path d="M8 5v14l11-7z"/>
                                        </svg>
                                      )}
                                    </button>
                                    
                                    {/* Progress Bar and Time */}
                                    <div className="flex-1 space-y-2">
                                      {/* Time Display */}
                                      <div className="flex items-center justify-between text-sm text-slate-400 font-medium">
                                        <span id="current-time">
                                          {audioRef && !isNaN(audioRef.duration) 
                                            ? `${Math.floor(audioRef.currentTime / 60)}:${String(Math.floor(audioRef.currentTime % 60)).padStart(2, '0')}`
                                            : '0:00'
                                          }
                                        </span>
                                        <span id="total-time">
                                          {audioRef && !isNaN(audioRef.duration)
                                            ? `${Math.floor(audioRef.duration / 60)}:${String(Math.floor(audioRef.duration % 60)).padStart(2, '0')}`
                                            : '0:00'
                                          }
                                        </span>
                                      </div>
                                      
                                      {/* Progress Bar */}
                                      <div 
                                        className="relative h-2 bg-slate-700/50 rounded-full cursor-pointer overflow-hidden border border-slate-600/50"
                                        onClick={(e) => {
                                          if (audioRef && !isNaN(audioRef.duration)) {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const percent = (e.clientX - rect.left) / rect.width;
                                            audioRef.currentTime = percent * audioRef.duration;
                                          }
                                        }}
                                      >
                                        <div 
                                          id="audio-progress"
                                          className="absolute left-0 top-0 h-full bg-gradient-to-r from-brand-500 via-purple-500 to-pink-500 rounded-full transition-all duration-100"
                                          style={{ width: '0%' }}
                                        >
                                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg"></div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Volume Control */}
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                      <button
                                        onClick={() => {
                                          if (audioRef) {
                                            audioRef.muted = !audioRef.muted;
                                          }
                                        }}
                                        className="w-12 h-12 rounded-full bg-slate-800/60 hover:bg-slate-700/80 border-2 border-slate-600/50 hover:border-brand-500/50 transition-all duration-300 flex items-center justify-center"
                                      >
                                        <svg className="w-5 h-5 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                                        </svg>
                                      </button>
                                      
                                      <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        defaultValue="100"
                                        onChange={(e) => {
                                          if (audioRef) {
                                            audioRef.volume = e.target.value / 100;
                                          }
                                        }}
                                        className="w-24 h-2 bg-slate-700/50 rounded-full appearance-none cursor-pointer border border-slate-600/50"
                                        style={{
                                          background: 'linear-gradient(to right, rgb(99 102 241) 0%, rgb(168 85 247) 100%)',
                                        }}
                                      />
                                    </div>
                                    
                                  </div>
                                  
                                  {/* Visualizer Bar */}
                                
                                </div>
                                
                                {/* Status Card */}
                                {isPlayingAudio && (
                                  <div className="flex items-center justify-center gap-4 p-4 bg-gradient-to-r from-brand-500/10 via-purple-500/10 to-pink-500/10 rounded-xl border border-brand-500/20">
                                    <div className="relative flex h-3 w-3">
                                      <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></div>
                                      <div className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></div>
                                    </div>
                                    <span className="text-slate-300 font-semibold text-sm tracking-wide">
                                      NOW PLAYING
                                    </span>
                                  </div>
                                )}
                                
                                {/* Info Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                                  <div className="p-4 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50">
                                    <div className="text-brand-400 text-xs font-bold uppercase tracking-wider mb-2">Audio Format</div>
                                    <div className="text-white font-semibold">MP3 • 24kHz</div>
                                  </div>
                                  <div className="p-4 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50">
                                    <div className="text-purple-400 text-xs font-bold uppercase tracking-wider mb-2">Voice Quality</div>
                                    <div className="text-white font-semibold">
                                      {ttsProvider === 'google-cloud' ? 'Neural2 Premium' : 'Standard'}
                                    </div>
                                  </div>
                                  <div className="p-4 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50">
                                    <div className="text-pink-400 text-xs font-bold uppercase tracking-wider mb-2">Playback</div>
                                    <div className="text-white font-semibold">Full Controls</div>
                                  </div>
                                </div>
                                
                              </div>
                            ) : (
                              /* Browser TTS Fallback */
                              <div className="space-y-6">
                                <div className="p-8 bg-gradient-to-br from-orange-500/10 to-amber-500/10 backdrop-blur-sm rounded-2xl border border-orange-500/30">
                                  
                                  <div className="text-center mb-8">
                                    <div className="inline-flex items-center gap-3 px-5 py-3 bg-orange-500/20 rounded-full mb-4 border border-orange-500/30">
                                      <div className="relative flex h-3 w-3">
                                        <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></div>
                                        <div className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></div>
                                      </div>
                                      <span className="text-sm font-bold text-orange-300 uppercase tracking-wider">
                                        Browser Speech Mode
                                      </span>
                                    </div>
                                    <p className="text-slate-300 text-sm max-w-md mx-auto">
                                      Using your browser's text-to-speech engine
                                    </p>
                                  </div>
                                  
                                  <div className="flex flex-wrap items-center justify-center gap-4">
                                    {!isPlayingAudio ? (
                                      <button
                                        onClick={playAudioSummary}
                                        className="group relative px-12 py-5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold rounded-2xl shadow-2xl transform hover:scale-105 active:scale-95 transition-all duration-300 overflow-hidden"
                                      >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                        <span className="relative text-lg tracking-wide">Play Audio</span>
                                      </button>
                                    ) : (
                                      <>
                                        <button
                                          onClick={pauseAudioSummary}
                                          className="px-10 py-4 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-bold rounded-xl shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200"
                                        >
                                          Pause
                                        </button>
                                        <button
                                          onClick={stopAudioSummary}
                                          className="px-10 py-4 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold rounded-xl shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200"
                                        >
                                          Stop
                                        </button>
                                      </>
                                    )}
                                  </div>
                                  
                                  {isPlayingAudio && (
                                    <div className="mt-8 flex items-center justify-center gap-1.5">
                                      {[...Array(20)].map((_, i) => (
                                        <div
                                          key={i}
                                          className="w-1 bg-gradient-to-t from-orange-600 via-amber-500 to-yellow-500 rounded-full"
                                          style={{
                                            height: `${Math.random() * 24 + 8}px`,
                                            animation: `pulse ${Math.random() * 0.5 + 0.5}s ease-in-out infinite`,
                                            animationDelay: `${i * 0.05}s`
                                          }}
                                        ></div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Tips Section */}
                            <div className="mt-8 p-6 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center border border-brand-500/30">
                                  <span className="text-brand-400 text-sm font-bold">i</span>
                                </div>
                                <div className="flex-1">
                                  <h4 className="text-white font-semibold mb-2">Playback Tips</h4>
                                  <ul className="text-slate-400 text-sm space-y-1.5">
                                    <li>• Use the timeline to skip to any part of the audio</li>
                                    <li>• Adjust volume with the slider or use keyboard controls</li>
                                    <li>• Audio will automatically pause when you switch tabs</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                            
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-purple-50 to-pink-50 dark:from-brand-950 dark:via-purple-950 dark:to-pink-950 opacity-50"></div>
                        <div className="relative text-center py-20 px-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border-2 border-dashed border-brand-200 dark:border-brand-800">
                          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-brand-100 to-purple-100 dark:from-brand-900 dark:to-purple-900 rounded-full mb-6">
                            <svg className="w-12 h-12 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                          </div>
                          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                            Create Audio Summary
                          </h3>
                          <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-lg mx-auto">
                            Convert your resume analysis into a professional audio narration. Perfect for reviewing on-the-go or multitasking.
                          </p>
                          
                          <Button 
                            onClick={generateAudioSummary} 
                            disabled={generatingAudio || !analysis} 
                            size="lg"
                            className="!px-8 !py-4 !text-lg !rounded-xl shadow-lg hover:shadow-xl transition-all"
                          >
                            {generatingAudio ? (
                              <>
                                <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Generating Audio...
                              </>
                            ) : (
                              '🎙️ Generate Audio Summary'
                            )}
                          </Button>
                          
                          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Uses Google Cloud TTS for high-quality audio</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </AnimatedPage>
    </div>
  );
}
