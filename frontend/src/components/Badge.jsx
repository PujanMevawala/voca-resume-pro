import React from 'react';
import { cn } from '../lib/cn';

export default function Badge({ 
  children, 
  variant = 'default',
  size = 'md',
  animated = false,
  className = '',
  ...props 
}) {
  const variants = {
    default: 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100',
    primary: 'bg-brand-100 dark:bg-brand-900/30 text-brand-800 dark:text-brand-200 border border-brand-300 dark:border-brand-700',
    success: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-700',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700',
    danger: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-700',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-700',
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold rounded-full',
        'transition-all duration-200',
        variants[variant],
        sizes[size],
        animated && 'animate-pulse',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
