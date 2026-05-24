import React from 'react';
import {
  Copy, Download, CheckCircle, AlertCircle,
  Smile, Meh, Frown, FileText, Image, Hash, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from './LoadingSpinner';

const SENTIMENT_CONFIG = {
  positive: { icon: Smile, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
  negative: { icon: Frown, color: 'text-red-500',   bg: 'bg-red-50 dark:bg-red-900/20' },
  neutral:  { icon: Meh,   color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
};

const INPUT_TYPE_ICON = {
  image: <Image className="w-4 h-4 text-purple-500" />,
  pdf:   <FileText className="w-4 h-4 text-red-500" />,
  text:  <FileText className="w-4 h-4 text-blue-500" />,
};

// ── helpers ────────────────────────────────────────────────────────────────

const copy = (text, label) => {
  navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied!`));
};

const CopyBtn = ({ text, label }) => (
  <button
    onClick={() => copy(text, label)}
    className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
  >
    <Copy className="w-3.5 h-3.5" /> Copy
  </button>
);

// ── main component ─────────────────────────────────────────────────────────

const OutputPanel = ({ results, isLoading }) => {

  const downloadReport = () => {
    if (!results) return;
    const lines = [
      'ChatLog Summary Report',
      '======================\n',
      `INPUT TYPE : ${results.input_type?.toUpperCase() ?? 'N/A'}`,
      `WORD COUNT : ${results.word_count ?? 'N/A'}`,
      `READING TIME: ~${results.reading_time ?? '?'} min`,
      `SENTIMENT  : ${results.sentiment?.toUpperCase() ?? 'N/A'}\n`,
      'SUMMARY',
      '-------',
      results.summary,
      '',
      'KEY POINTS',
      '----------',
      ...results.key_points.map((p, i) => `${i + 1}. ${p}`),
      '',
      'ACTION ITEMS',
      '------------',
      results.action_items.length
        ? results.action_items.map((a, i) => `${i + 1}. ${a}`).join('\n')
        : 'None detected.',
    ];

    if (results.speaker_summary && Object.keys(results.speaker_summary).length) {
      lines.push('', 'SPEAKER SUMMARIES', '-----------------');
      Object.entries(results.speaker_summary).forEach(([spk, s]) => {
        lines.push(`${spk}: ${s}`);
      });
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chatlog-summary.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Report downloaded!');
  };

  // ── states ──

  if (isLoading) {
    return (
      <div className="card">
        <LoadingSpinner message="Running AI summarisation — this may take a moment…" />
      </div>
    );
  }

  if (!results) {
    return (
      <div className="card flex flex-col items-center justify-center min-h-[400px] text-slate-400 dark:text-slate-600">
        <AlertCircle className="w-12 h-12 mb-3" />
        <p className="text-center text-sm">
          Your AI-generated summary will appear here.<br />
          Upload an image, PDF, or paste chat text to get started.
        </p>
      </div>
    );
  }

  const sentiment = results.sentiment || 'neutral';
  const SentimentIcon = SENTIMENT_CONFIG[sentiment]?.icon ?? Meh;
  const sentimentColor = SENTIMENT_CONFIG[sentiment]?.color ?? 'text-slate-400';
  const sentimentBg    = SENTIMENT_CONFIG[sentiment]?.bg    ?? '';

  return (
    <div className="card flex flex-col gap-6">

      {/* ── Header row ─────────────────────────────────────── */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Summary Results</h2>
        <button
          onClick={downloadReport}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg
                     bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600
                     transition-colors font-medium"
          title="Download report"
        >
          <Download className="w-4 h-4" /> Download
        </button>
      </div>

      {/* ── Meta badges ────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 text-xs">
        {results.input_type && (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700">
            {INPUT_TYPE_ICON[results.input_type]}
            {results.input_type.toUpperCase()} input
          </span>
        )}
        {results.word_count != null && (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700">
            <Hash className="w-3.5 h-3.5 text-slate-500" />
            {results.word_count} words
          </span>
        )}
        {results.reading_time != null && (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            ~{results.reading_time} min read
          </span>
        )}
      </div>

      {/* ── Sentiment ──────────────────────────────────────── */}
      {results.sentiment && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${sentimentBg}`}>
          <SentimentIcon className={`w-5 h-5 ${sentimentColor}`} />
          <span className="text-sm font-medium capitalize">
            Overall sentiment: <strong>{results.sentiment}</strong>
          </span>
        </div>
      )}

      {/* ── Summary ────────────────────────────────────────── */}
      <Section
        title="Summary"
        copyText={results.summary}
        copyLabel="Summary"
      >
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {results.summary}
        </p>
      </Section>

      {/* ── Key Points ─────────────────────────────────────── */}
      <Section
        title="Key Points"
        copyText={results.key_points.join('\n')}
        copyLabel="Key Points"
      >
        {results.key_points.length ? (
          <ul className="space-y-2">
            {results.key_points.map((pt, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                {pt}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm italic text-slate-400">No key points detected.</p>
        )}
      </Section>

      {/* ── Action Items ───────────────────────────────────── */}
      <Section
        title="Action Items"
        copyText={results.action_items.join('\n')}
        copyLabel="Action Items"
      >
        {results.action_items.length ? (
          <ul className="space-y-2">
            {results.action_items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900
                                  flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm italic text-slate-400">No action items detected.</p>
        )}
      </Section>

      {/* ── Speaker summaries (optional) ───────────────────── */}
      {results.speaker_summary && Object.keys(results.speaker_summary).length > 0 && (
        <Section title="Speaker Summaries">
          <div className="space-y-3">
            {Object.entries(results.speaker_summary).map(([speaker, summary]) => (
              <div key={speaker} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700">
                <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1 uppercase tracking-wide">
                  {speaker}
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{summary}</p>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
};

// ── Reusable section wrapper ───────────────────────────────────────────────

const Section = ({ title, copyText, copyLabel, children }) => (
  <div>
    <div className="flex justify-between items-center mb-2">
      <h3 className="section-title mb-0">{title}</h3>
      {copyText && <CopyBtn text={copyText} label={copyLabel || title} />}
    </div>
    {children}
  </div>
);

export default OutputPanel;