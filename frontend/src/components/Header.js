import React, { useState, useEffect } from 'react';
import { Sun, Moon, MessageSquare } from 'lucide-react';

const Header = () => {
  const [darkMode, setDarkMode] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <header className="flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-blue-600 rounded-xl shadow-md">
          <MessageSquare className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            ChatLog Summarizer
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            AI-powered — supports images, PDFs &amp; plain text
          </p>
        </div>
      </div>

      <button
        onClick={() => setDarkMode(d => !d)}
        className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
        aria-label="Toggle dark mode"
      >
        {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
      </button>
    </header>
  );
};

export default Header;