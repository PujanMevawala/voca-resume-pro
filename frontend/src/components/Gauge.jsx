import React from 'react';

function Gauge({ value = 0, size = 200 }) {
  // Ensure value is between 0 and 100
  const normalizedValue = Math.max(0, Math.min(100, value));
  
  // Calculate stroke dash offset for the progress arc
  const circumference = 2 * Math.PI * 70; // radius = 70
  const offset = circumference - (normalizedValue / 100) * circumference;
  
  // Determine color based on score
  const getColor = (score) => {
    if (score >= 80) return '#10b981'; // green
    if (score >= 60) return '#3b82f6'; // blue
    if (score >= 40) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };
  
  const color = getColor(normalizedValue);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx="100"
          cy="100"
          r="70"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          className="text-slate-200 dark:text-slate-700"
        />
        
        {/* Progress arc */}
        <circle
          cx="100"
          cy="100"
          r="70"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          style={{
            filter: 'drop-shadow(0 0 8px currentColor)',
          }}
        />
      </svg>
      
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-5xl font-bold"
          style={{ color }}
        >
          {Math.round(normalizedValue)}
        </span>
        <span className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Match Score
        </span>
      </div>
    </div>
  );
}

export default Gauge;
