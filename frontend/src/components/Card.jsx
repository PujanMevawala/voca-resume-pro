import React from 'react';
import { cn } from '../lib/cn';

export function Card({ className, children }) {
  return (
    <div className={cn('glass rounded-xl p-6', className)}>
      {children}
    </div>
  );
}

export default Card;
