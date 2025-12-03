import React from 'react';
import { cn } from '../lib/cn';

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Gradient Orbs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 dark:bg-purple-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-brand-300 dark:bg-brand-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 dark:bg-pink-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5 dark:opacity-10"></div>
      
      {/* Radial Gradient */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-white/50 dark:to-slate-950/50"></div>
    </div>
  );
}
