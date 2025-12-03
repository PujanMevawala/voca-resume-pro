import React from 'react';
import { cn } from '../lib/cn';

export default function ProgressBar({ 
  value = 0, 
  max = 100, 
  className = '',
  showLabel = false,
  color = 'brand',
  animated = true,
  size = 'md'
}) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const colorClasses = {
    brand: 'bg-brand-500',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  };

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={cn('w-full', className)}>
      <div className={cn(
        'relative w-full rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800',
        sizeClasses[size]
      )}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            colorClasses[color],
            animated && 'animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:200%_100%]'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {showLabel && (
        <div className="mt-1 text-right text-xs text-slate-600 dark:text-slate-400">
          {Math.round(percentage)}%
        </div>
      )}
    </div>
  );
}
