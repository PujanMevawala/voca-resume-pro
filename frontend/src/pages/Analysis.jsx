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

      // Store the audio text
      setAudioText(scriptData.script);

      // Then, convert script to audio using TTS
      const audioData = await api.post('/api/audio/synthesize', {
        text: scriptData.script,
        voice: 'professional',
      }, token);

      console.log('Audio data:', audioData);

      // Handle browser TTS fallback
      if (audioData.useBrowserTTS) {
        toast.success('Audio summary ready - Click play to listen');
        setActiveTab('summary');
      } else if (audioData.audioUrl) {
        setAudioUrl(audioData.audioUrl);
        toast.success('Audio summary generated!');
        setActiveTab('summary');
      } else {
        toast.error('No audio URL received from server');
      }
    } catch (err) {
      console.error('Audio generation error:', err);
      toast.error('Failed to generate audio: ' + err.message);
    } finally {
      setGeneratingAudio(false);
    }
  };

  const playAudioSummary = () => {
    if (audioUrl) {
      // Use HTML5 audio element
      const audio = document.querySelector('audio');
      if (audio) {
        audio.play();
        setIsPlayingAudio(true);
      }
    } else if (audioText && 'speechSynthesis' in window) {
      // Use Web Speech API
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
    if (audioUrl) {
      const audio = document.querySelector('audio');
      if (audio) {
        audio.pause();
        setIsPlayingAudio(false);
      }
    } else if ('speechSynthesis' in window && speechSynthesis.speaking) {
      speechSynthesis.pause();
      setIsPlayingAudio(false);
    }
  };

  const stopAudioSummary = () => {
    if (audioUrl) {
      const audio = document.querySelector('audio');
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        setIsPlayingAudio(false);
      }
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
                ← Back to Documents
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
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                disabled={loading}
              >
                {availableModels.map(model => (
                  <option key={model.id} value={model.id}>{model.name}</option>
                ))}
              </select>

              <Button 
                onClick={runAnalysis} 
                disabled={loading || !jobDescription.trim() || resumeInfo?.status !== 'ready'} 
                size="md"
              >
                {loading ? 'Analyzing...' : ' Analyze Resume'}
              </Button>

              {analysis && (
                <Button 
                  onClick={generateAudioSummary}
                  disabled={generatingAudio}
                  variant="secondary"
                  size="md"
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
                      <div className="space-y-4">
                        <div className="p-8 bg-gradient-to-r from-brand-50 to-purple-50 dark:from-brand-900/20 dark:to-purple-900/20 rounded-xl border border-brand-200 dark:border-brand-800 shadow-lg">
                          <div className="text-center mb-6">
                            <div className="text-5xl mb-3 animate-bounce">🎧</div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                              Audio Summary Ready
                            </h3>
                            <p className="text-slate-700 dark:text-slate-300">
                              Your analysis summary has been converted to audio
                            </p>
                          </div>
                          
                          {audioUrl ? (
                            <audio controls className="w-full mt-4 rounded-lg">
                              <source src={audioUrl} type="audio/mpeg" />
                              Your browser does not support the audio element.
                            </audio>
                          ) : (
                            <div className="mt-6 space-y-4">
                              {/* Custom Audio Controls */}
                              <div className="flex items-center justify-center gap-4">
                                <Button 
                                  onClick={playAudioSummary} 
                                  disabled={isPlayingAudio}
                                  size="lg"
                                  className="!rounded-full !px-6"
                                >
                                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
                                  </svg>
                                  <span className="ml-2">Play</span>
                                </Button>
                                
                                <Button 
                                  onClick={pauseAudioSummary} 
                                  disabled={!isPlayingAudio}
                                  size="lg"
                                  className="!rounded-full !px-6 !bg-amber-500 hover:!bg-amber-600"
                                >
                                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                                  </svg>
                                  <span className="ml-2">Pause</span>
                                </Button>
                                
                                <Button 
                                  onClick={stopAudioSummary}
                                  size="lg"
                                  className="!rounded-full !px-6 !bg-red-500 hover:!bg-red-600"
                                >
                                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd"/>
                                  </svg>
                                  <span className="ml-2">Stop</span>
                                </Button>
                              </div>
                              
                              {isPlayingAudio && (
                                <div className="flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400">
                                  <svg className="animate-pulse w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"/>
                                  </svg>
                                  <span className="text-sm font-medium">Playing audio...</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-16 px-6 bg-slate-50 dark:bg-slate-900/20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700">
                        <div className="text-7xl mb-6">🔊</div>
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                          No Audio Summary Yet
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                          Generate an audio summary of your resume analysis to listen on-the-go
                        </p>
                        <Button onClick={generateAudioSummary} disabled={generatingAudio || !analysis} size="lg">
                          {generatingAudio ? (
                            <>
                              <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Generating Audio...
                            </>
                          ) : (
                            <>
                              🎙️ Generate Audio Summary
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* No Analysis State */}
          {!analysis && !loading && (
            <div className="glass rounded-2xl p-12 text-center border border-white/20">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2 text-slate-700 dark:text-slate-300">
                Ready to Analyze
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Enter a job description above and click "Run Complete Analysis" to get started
              </p>
            </div>
          )}
        </div>
      </AnimatedPage>
    </div>
  );
}
