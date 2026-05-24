import React, { useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Header from './components/Header';
import InputPanel from './components/InputPanel';
import OutputPanel from './components/OutputPanel';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function App() {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [summaryLength, setSummaryLength] = useState('medium');
  
  const handleSummarize = async () => {
    if (!inputText.trim()) {
      toast.error('Please paste some chat text first.');
      return;
    }
    setIsLoading(true);
    setResults(null);
    try {
      const res = await fetch(`${API_BASE}/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, summary_length: summaryLength }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Summarisation failed.');
      }
      setResults(await res.json());
      toast.success('Summary ready!');
    } catch (e) {
      toast.error(e.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Summarise uploaded file (image / PDF / txt) ─────────────────────────
  const handleFileUpload = async (file) => {
    setIsLoading(true);
    setResults(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('summary_length', summaryLength);
    try {
      const res = await fetch(`${API_BASE}/summarize-file`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'File summarisation failed.');
      }
      setResults(await res.json());
      setInputText('');
      toast.success('File summarised successfully!');
    } catch (e) {
      toast.error(e.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50
                    dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Header />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
          <InputPanel
            inputText={inputText}
            setInputText={setInputText}
            isLoading={isLoading}
            onSummarize={handleSummarize}
            onFileUpload={handleFileUpload}
            summaryLength={summaryLength}
            setSummaryLength={setSummaryLength}
          />
          <OutputPanel results={results} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}

export default App;
