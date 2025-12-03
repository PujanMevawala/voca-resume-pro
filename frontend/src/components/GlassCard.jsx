import React from 'react';
import { cn } from '../lib/cn';

export default function GlassCard({ 
  children, 
  className = '', 
  hover = false,
  glow = false,
  gradient = false,
  ...props 
}) {
  return (
    <div
      className={cn(
        'glass rounded-2xl p-6 border border-white/20 backdrop-blur-xl',
        'transition-all duration-300',
        hover && 'hover:scale-[1.02] hover:shadow-2xl hover:border-white/30',
        glow && 'shadow-lg shadow-brand-500/10 dark:shadow-brand-400/10',
        gradient && 'bg-gradient-to-br from-white/10 to-white/5 dark:from-white/5 dark:to-transparent',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
