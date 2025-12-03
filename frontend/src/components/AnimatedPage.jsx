import React from 'react';
import { motion } from 'framer-motion';

export function AnimatedPage({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8"
    >
      {children}
    </motion.div>
  );
}

export default AnimatedPage;
