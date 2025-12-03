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
    <div className="app-background relative overflow-hidden">
      <AnimatedBackground />
      <AnimatedPage>
        <section className="pt-20 pb-10 text-center relative z-10">
          {/* Hero Section */}
          <div className="animate-slide-in-up">
            <Badge variant="primary" size="lg" className="mb-6">
              🚀 AI-Powered Resume Intelligence
            </Badge>
            <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-brand-400 via-purple-500 to-pink-500 animate-float">
              VocaResume Pro
            </h1>
            <p className="mt-6 text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
              Transform your job search with AI-powered resume analysis, intelligent chat assistance, 
              and audio transcription. <span className="text-brand-600 dark:text-brand-400 font-semibold">100% open-source</span> and privacy-first.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
              <Button 
                size="lg" 
                onClick={handleGetStarted}
                className="!px-8 !py-4 !text-lg shadow-xl hover:shadow-2xl animate-scale-in"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                Get Started Free
              </Button>
              <Button 
                size="lg"
                className="!bg-transparent !text-brand-600 dark:!text-brand-400 border-2 border-brand-500 hover:!bg-brand-50 dark:hover:!bg-brand-900/20"
                onClick={() => window.open('https://github.com/PujanMevawala/voca-resume-pro', '_blank')}
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                View on GitHub
              </Button>
            </div>
          </div>

          {/* Stats Section */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {[
              { icon: '🤖', value: '6+', label: 'AI Models' },
              { icon: '📊', value: '100%', label: 'Open Source' },
              { icon: '🔒', value: 'Local', label: 'Data Storage' },
              { icon: '⚡', value: 'Fast', label: 'Processing' },
            ].map((stat, i) => (
              <GlassCard 
                key={i} 
                hover 
                gradient 
                className="text-center p-6 animate-slide-in-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="text-4xl mb-2">{stat.icon}</div>
                <div className="text-3xl font-bold text-brand-600 dark:text-brand-400 mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  {stat.label}
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Feature Cards */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
            {[
              {
                icon: '💬',
                title: 'AI Chat Assistant',
                description: 'Ask questions about your resumes and documents. Get instant answers with context-aware AI powered by RAG technology.',
                badge: 'Smart',
                color: 'blue'
              },
              {
                icon: '📁',
                title: 'Document Library',
                description: 'Manage resumes, job descriptions, and cover letters in one place with smart search and organization.',
                badge: 'Organized',
                color: 'green'
              },
              {
                icon: '🎯',
                title: 'Smart Analysis',
                description: 'Get ATS scores, interview prep questions, and tailored suggestions using powerful local LLM models.',
                badge: 'Intelligent',
                color: 'purple'
              },
              {
                icon: '🎙️',
                title: 'Audio Transcription',
                description: 'Upload audio files for automatic transcription and AI-powered summarization using Whisper.',
                badge: 'Audio',
                color: 'amber'
              },
              {
                icon: '🔒',
                title: 'Privacy First',
                description: 'Everything runs locally on your infrastructure. No data sent to external APIs. Fully open-source and secure.',
                badge: 'Secure',
                color: 'red'
              },
              {
                icon: '⚡',
                title: 'Fast & Modern',
                description: 'Built with React, Fastify, and containerized microservices for blazing-fast performance and scalability.',
                badge: 'Powerful',
                color: 'brand'
              },
            ].map((feature, i) => (
              <GlassCard 
                key={i} 
                hover 
                glow
                className="p-8 animate-slide-in-up group"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="flex items-start gap-4">
                  <div className="text-5xl group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100">
                        {feature.title}
                      </h3>
                      <Badge variant={feature.color === 'brand' ? 'primary' : feature.color} size="sm">
                        {feature.badge}
                      </Badge>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>

          {/* CTA Section */}
          <div className="mt-24 mb-12">
            <GlassCard hover gradient glow className="p-12 text-center max-w-4xl mx-auto">
              <div className="text-5xl mb-4 animate-bounce">🚀</div>
              <h2 className="text-3xl font-bold mb-4 text-slate-900 dark:text-slate-100">
                Ready to Transform Your Job Search?
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
                Join thousands of job seekers using AI to land their dream jobs faster. 
                No credit card required. Start in seconds.
              </p>
              <Button 
                size="lg" 
                onClick={handleGetStarted}
                className="!px-12 !py-5 !text-xl shadow-2xl hover:shadow-brand-500/50"
              >
                Start Your Journey
                <svg className="w-6 h-6 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Button>
            </GlassCard>
          </div>
        </section>
      </AnimatedPage>
    </div>
  );
}
