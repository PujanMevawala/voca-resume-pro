import React, { useState, useEffect } from 'react';
import AnimatedPage from '../components/AnimatedPage';
import Card from '../components/Card';
import Button from '../components/Button';
import { toast } from 'sonner';
import { api } from '../services/api';
import { useSearchParams, NavLink } from 'react-router-dom';

export default function Summary({ token, resumeId }) {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [search] = useSearchParams();
  const qResumeId = search.get('resumeId') || resumeId;

  useEffect(() => {
    // Auto-fetch summary if resumeId present
    if (qResumeId && !summary && !loading) {
      (async () => {
        try {
          setLoading(true);
          const res = await api.post('/api/resume/summary', { resumeId: qResumeId }, token);
          setSummary(res.summary || '');
        } catch (e) {
          // silent; user can try again
        } finally {
          setLoading(false);
        }
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qResumeId]);

  const getSummary = async () => {
    try {
      setLoading(true);
      const res = await api.post('/api/resume/summary', { resumeId }, token);
      setSummary(res.summary || '');
      toast.success('Summary generated');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatedPage>
      <div className="max-w-3xl mx-auto pt-14 space-y-4">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Summary</h2>
            <Button onClick={getSummary} disabled={!qResumeId || loading}>{loading ? 'Working…' : 'Generate / Refresh'}</Button>
          </div>
          <div className="mt-4">
            {summary ? (
              <pre className="prose-pre text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{summary}</pre>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-400">No summary yet. <NavLink to="/upload" className="underline hover:text-brand-600">Upload a resume</NavLink> and click Generate.</p>
            )}
          </div>
        </Card>
      </div>
    </AnimatedPage>
  );
}
