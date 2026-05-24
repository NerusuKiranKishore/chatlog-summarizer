import React from 'react';

const LoadingSpinner = ({ message = 'Analysing your chat log…' }) => (
  <div className="flex flex-col items-center justify-center gap-4 py-16">
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 rounded-full border-4 border-slate-200 dark:border-slate-700" />
      <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
    </div>
    <p className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">{message}</p>
  </div>
);

export default LoadingSpinner;