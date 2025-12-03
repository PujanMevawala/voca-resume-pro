import React, { useState } from 'react';
import AnimatedPage from '../components/AnimatedPage';
import Card from '../components/Card';
import UploadDropzone from '../components/UploadDropzone';
import Button from '../components/Button';
import { toast } from 'sonner';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function Upload({ token, setResumeId }) {
  const [file, setFile] = useState();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const upload = async () => {
    if (!file) return;
    try {
      setLoading(true);
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.upload('/api/resume/upload', fd, token);
      setResumeId(res.id);
      toast.success('Resume uploaded! Redirecting to analysis...');
      navigate(`/analysis?resumeId=${encodeURIComponent(res.id)}`, { replace: true });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatedPage>
      <div className="max-w-2xl mx-auto pt-14 space-y-4">
        <Card>
          <h2 className="text-xl font-semibold">Upload your resume</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">PDF or TXT works best.</p>
          <div className="mt-4">
            <UploadDropzone onFileSelected={setFile} />
            {file && (
              <div className="mt-3 text-sm text-slate-700 dark:text-slate-300">Selected: <span className="font-medium">{file.name}</span></div>
            )}
            <Button className="mt-4" onClick={upload} disabled={!file || loading}>{loading ? 'Uploading…' : 'Upload'}</Button>
          </div>
        </Card>
      </div>
    </AnimatedPage>
  );
}
