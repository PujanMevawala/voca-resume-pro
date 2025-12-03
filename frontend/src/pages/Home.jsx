import React from 'react';
import AnimatedPage from '../components/AnimatedPage';
import AnimatedBackground from '../components/AnimatedBackground';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function Home({ token }) {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (token) {
      navigate('/documents');
      setTimeout(() => {
        toast.info('To start analysis or chat with AI, first upload your resume document, then click on Chat or Analysis for that resume.', {
          duration: 6000,
        });
      }, 500);
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="app-background relative overflow-hidden min-h-screen">
      <div className="absolute inset-0 bg-grid-slate bg-grid-16 opacity-30 dark:opacity-10 pointer-events-none" />
      <AnimatedBackground />
      <AnimatedPage>
        <section className="pt-32 pb-20 text-center relative z-10 px-4">
          {/* Hero Section */}
          <div className="animate-slide-in-up max-w-6xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-brand-500/10 to-purple-500/10 border border-brand-500/20 mb-8">
              <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">AI-Powered Resume Intelligence</span>
            </div>
            <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight mb-6">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-brand-600 to-purple-600 dark:from-slate-100 dark:via-brand-400 dark:to-purple-400">
                VocaResume Pro
              </span>
            </h1>
            <p className="mt-6 text-xl md:text-2xl text-slate-600 dark:text-slate-300 max-w-4xl mx-auto leading-relaxed font-light">
              Transform your job search with AI-powered resume analysis, intelligent chat assistance, 
              and audio transcription.
            </p>
            <p className="mt-4 text-lg text-slate-500 dark:text-slate-400 max-w-3xl mx-auto">
              <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20 text-sm font-medium">100% Open Source</span>
              <span className="mx-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 text-sm font-medium">Privacy First</span>
            </p>
            <div className="mt-12 flex items-center justify-center gap-4 flex-wrap">
              <button
                onClick={handleGetStarted}
                className="group relative px-10 py-4 text-lg font-semibold text-white bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-700 hover:to-purple-700 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
              >
                <span className="relative z-10">Get Started Free</span>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-brand-400 to-purple-400 blur-lg opacity-0 group-hover:opacity-50 transition-opacity"></div>
              </button>
              <button
                onClick={() => window.open('https://github.com/PujanMevawala/voca-resume-pro', '_blank')}
                className="px-10 py-4 text-lg font-semibold text-brand-600 dark:text-brand-400 bg-white dark:bg-slate-800 border-2 border-brand-500/30 hover:border-brand-500 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                View on GitHub
              </button>
            </div>
          </div>

          {/* Stats Section */}
          <div className="mt-32 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { value: '6+', label: 'AI Models', color: 'from-brand-500 to-brand-600' },
              { value: '100%', label: 'Open Source', color: 'from-green-500 to-emerald-600' },
              { value: 'Local', label: 'Data Storage', color: 'from-blue-500 to-cyan-600' },
              { value: 'Fast', label: 'Processing', color: 'from-purple-500 to-pink-600' },
            ].map((stat, i) => (
              <div
                key={i}
                className="relative group"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300" style={{background: `linear-gradient(to bottom right, var(--tw-gradient-stops))`}}></div>
                <div className="relative glass rounded-2xl p-8 text-center border border-slate-200 dark:border-slate-700 hover:border-brand-500/50 transition-all duration-300 transform hover:scale-105">
                  <div className={`text-4xl md:text-5xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent mb-3`}>
                    {stat.value}
                  </div>
                  <div className="text-sm md:text-base text-slate-600 dark:text-slate-400 font-medium">
                    {stat.label}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Feature Cards */}
          <div className="mt-32 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left max-w-7xl mx-auto">
            {[
              {
                title: 'AI Chat Assistant',
                description: 'Ask questions about your resumes and documents. Get instant answers with context-aware AI powered by RAG technology.',
                gradient: 'from-brand-500 to-purple-600'
              },
              {
                title: 'Document Library',
                description: 'Manage resumes, job descriptions, and cover letters in one place with smart search and organization.',
                gradient: 'from-green-500 to-emerald-600'
              },
              {
                title: 'Smart Analysis',
                description: 'Get ATS scores, interview prep questions, and tailored suggestions using powerful local LLM models.',
                gradient: 'from-purple-500 to-pink-600'
              },
              {
                title: 'Audio Transcription',
                description: 'Upload audio files for automatic transcription and AI-powered summarization using Whisper.',
                gradient: 'from-amber-500 to-orange-600'
              },
              {
                title: 'Privacy First',
                description: 'Everything runs locally on your infrastructure. No data sent to external APIs. Fully open-source and secure.',
                gradient: 'from-red-500 to-rose-600'
              },
              {
                title: 'Fast & Modern',
                description: 'Built with React, Fastify, and containerized microservices for blazing-fast performance and scalability.',
                gradient: 'from-blue-500 to-cyan-600'
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group relative"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300"></div>
                <div className="relative glass rounded-2xl p-8 border border-slate-200 dark:border-slate-700 hover:border-brand-500/50 transition-all duration-300 h-full">
                  <div className={`inline-block px-4 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${feature.gradient} mb-4 shadow-lg`}>
                    FEATURE
                  </div>
                  <h3 className="font-bold text-2xl text-slate-900 dark:text-slate-100 mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Section */}
          <div className="mt-32 mb-20">
            <div className="relative glass rounded-3xl p-12 md:p-16 text-center max-w-5xl mx-auto border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-purple-500/5 to-pink-500/5"></div>
              <div className="relative z-10">
                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900 dark:text-slate-100">
                  Ready to Transform Your Job Search?
                </h2>
                <p className="text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-3xl mx-auto leading-relaxed">
                  Join thousands of job seekers using AI to land their dream jobs faster. 
                  No credit card required. Start in seconds.
                </p>
                <button
                  onClick={handleGetStarted}
                  className="group relative px-12 py-5 text-xl font-semibold text-white bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-700 hover:to-purple-700 rounded-2xl shadow-2xl hover:shadow-brand-500/50 transition-all duration-300 transform hover:scale-105"
                >
                  <span className="relative z-10">Start Your Journey</span>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-brand-400 to-purple-400 blur-xl opacity-0 group-hover:opacity-50 transition-opacity"></div>
                </button>
              </div>
            </div>
          </div>
        </section>
      </AnimatedPage>
    </div>
  );
}
