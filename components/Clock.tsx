import React, { useState, useEffect } from 'react';
import { ClockIcon } from './icons/ClockIcon';

export const Clock: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timerId);
    };
  }, []);

  return (
    <div 
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-gray-200/50 dark:border-gray-700/50 bg-white/70 dark:bg-gray-800/70 px-4 py-2 font-mono text-sm font-semibold text-gray-700 dark:text-gray-200 shadow-lg backdrop-blur-sm"
      aria-live="polite"
      aria-atomic="true"
    >
      <ClockIcon />
      <span>
        {time.toLocaleTimeString()}
      </span>
    </div>
  );
};