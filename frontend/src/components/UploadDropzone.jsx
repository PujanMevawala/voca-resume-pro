import React, { useCallback, useRef, useState } from 'react';
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { cn } from '../lib/cn';

function UploadDropzone({ onFileSelected, className }) {
  const inputRef = useRef();
  const [isOver, setIsOver] = useState(false);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFileSelected?.(f);
  }, [onFileSelected]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={onDrop}
      className={cn('glass rounded-xl p-8 text-center border-dashed border-2', isOver ? 'border-brand-500 bg-brand-50/40 dark:bg-brand-500/10' : 'border-slate-300 dark:border-slate-700', className)}
    >
      <input ref={inputRef} type="file" className="hidden" onChange={(e) => onFileSelected?.(e.target.files?.[0])} />
      <ArrowUpTrayIcon className="h-8 w-8 mx-auto text-brand-600" />
      <p className="mt-3 text-slate-700 dark:text-slate-300">Drag & drop your resume (PDF/TXT) here, or</p>
      <button
        className="mt-3 inline-flex items-center justify-center px-4 py-2 rounded-md bg-brand-600 text-white hover:bg-brand-500"
        onClick={() => inputRef.current?.click()}
      >
        Choose file
      </button>
    </div>
  );
}

export default UploadDropzone;
