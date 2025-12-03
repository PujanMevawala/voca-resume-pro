import React from 'react';
import { cn } from '../lib/cn';

export function Button({
  as: Comp = 'button',
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) {
  const base = 'inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none';
  const variants = {
    primary: 'bg-brand-600 hover:bg-brand-500 text-white shadow-glow focus:ring-brand-400 dark:focus:ring-brand-600',
    secondary: 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700',
    outline: 'border border-slate-300 hover:bg-slate-50 text-slate-900 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-800',
    ghost: 'hover:bg-slate-100 dark:hover:bg-slate-800',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-400',
  };
  const sizes = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4',
    lg: 'h-12 px-6 text-lg',
  };
  return (
    <Comp className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </Comp>
  );
}

export default Button;
