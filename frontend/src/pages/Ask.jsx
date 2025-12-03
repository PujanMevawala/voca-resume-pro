import React, { useState, useEffect } from 'react';
import AnimatedPage from '../components/AnimatedPage';
import Card from '../components/Card';
import Button from '../components/Button';
import { toast } from 'sonner';
import { api } from '../services/api';

export default function Ask({ token, resumeId }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    if (!question.trim()) return;
    try {
      setLoading(true);
      setAnswer('');
      const data = await api.post('/api/resume/query', { resumeId, question }, token);
      setAnswer(data.answer || 'No answer provided');
      toast.success('Answer received!');
    } catch (e) {
      toast.error(e.message || 'Failed to get answer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatedPage>
      <div className="max-w-3xl mx-auto pt-14 space-y-4">
        <Card>
          <h2 className="text-xl font-semibold">Ask a question</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Ask anything about your resume - get AI-powered answers instantly.</p>
          <textarea
            rows={4}
            className="mt-4 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/50 p-3 outline-none focus:ring-2 focus:ring-brand-400"
            placeholder="e.g., What are my strongest skills? How can I improve my resume for a software engineer role?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <div className="mt-3">
            <Button onClick={ask} disabled={!resumeId || !question.trim() || loading}>
              {loading ? 'Thinking…' : 'Ask'}
            </Button>
          </div>
        </Card>

        {answer && (
          <Card>
            <h3 className="text-lg font-semibold mb-2">Answer</h3>
            <div className="prose dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-300">{answer}</p>
            </div>
          </Card>
        )}
      </div>
    </AnimatedPage>
  );
}
