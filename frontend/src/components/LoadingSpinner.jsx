import React from 'react';
import { cn } from '../lib/cn';

export default function LoadingSpinner({ size = 'md', className = '', text = '' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
      <div className="relative">
        {/* Outer Ring */}
        <div className={cn(
          sizeClasses[size],
          'rounded-full border-4 border-brand-200 dark:border-brand-900/30'
        )}></div>
        
        {/* Spinning Ring */}
        <div className={cn(
          sizeClasses[size],
          'absolute top-0 left-0 rounded-full border-4 border-transparent border-t-brand-500 animate-spin'
        )}></div>
        
        {/* Inner Pulse */}
        <div className={cn(
          'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
          size === 'sm' && 'w-1 h-1',
          size === 'md' && 'w-2 h-2',
          size === 'lg' && 'w-3 h-3',
          size === 'xl' && 'w-4 h-4',
          'bg-brand-500 rounded-full animate-pulse'
        )}></div>
      </div>
      
      {text && (
        <p className="text-sm text-slate-600 dark:text-slate-400 animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
}
