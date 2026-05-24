import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader, Image, X } from 'lucide-react';

const ACCEPTED_TYPES = {
  'text/plain': ['.txt'],
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'image/bmp': ['.bmp'],
  'image/tiff': ['.tiff', '.tif'],
};

const InputPanel = ({
  inputText,
  setInputText,
  isLoading,
  onSummarize,
  onFileUpload,
  summaryLength,
  setSummaryLength,
}) => {
  const [droppedFile, setDroppedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setDroppedFile(file);

    // Show image preview if applicable
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }

    onFileUpload(file);
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: 1,
    disabled: isLoading,
  });

  const clearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setDroppedFile(null);
    setPreviewUrl(null);
  };

  const handleClear = () => {
    setInputText('');
    clearFile();
  };

  const isImage = droppedFile?.type?.startsWith('image/');
  const isPdf   = droppedFile?.type === 'application/pdf';

  return (
    <div className="card flex flex-col gap-5">
      <h2 className="text-xl font-bold">Input Chat Log</h2>

      {/* ── Textarea ──────────────────────────────────────────── */}
      <div>
        <label className="section-title block">Paste text</label>
        <textarea
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder={'Paste your WhatsApp / Slack / Teams chat here…\nExample:\n12/01/2025, 10:45 AM - Alice: Hey, can you review the doc?\n12/01/2025, 10:46 AM - Bob: Sure, will do by EOD.'}
          className="w-full h-52 p-3 text-sm border border-slate-300 dark:border-slate-600 rounded-xl
                     bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none
                     resize-y placeholder:text-slate-400"
          disabled={isLoading}
        />
      </div>

      {/* ── Divider ───────────────────────────────────────────── */}
      <div className="flex items-center gap-3 text-slate-400 text-sm">
        <span className="flex-1 border-t border-slate-200 dark:border-slate-700" />
        or upload a file
        <span className="flex-1 border-t border-slate-200 dark:border-slate-700" />
      </div>

      {/* ── Dropzone ──────────────────────────────────────────── */}
      {!droppedFile ? (
        <div
          {...getRootProps()}
          className={`p-6 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors
            ${isDragActive
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {isDragActive ? 'Drop it!' : 'Drag & drop or click to upload'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Supported: PNG · JPG · WEBP · PDF · TXT
          </p>
        </div>
      ) : (
        <div className="relative border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-700">
          {/* Preview */}
          {isImage && previewUrl && (
            <img src={previewUrl} alt="preview" className="w-full max-h-48 object-contain rounded-lg mb-2" />
          )}
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            {isImage ? <Image className="w-4 h-4 text-purple-500" /> : <FileText className="w-4 h-4 text-red-500" />}
            <span className="truncate flex-1">{droppedFile.name}</span>
            <span className="text-xs text-slate-400">({(droppedFile.size / 1024).toFixed(1)} KB)</span>
          </div>
          <button
            onClick={clearFile}
            className="absolute top-2 right-2 p-1 rounded-full bg-slate-200 dark:bg-slate-600 hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
            title="Remove file"
          >
            <X className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
      )}

      {/* ── Summary length ───────────────────────────────────── */}
      <div>
        <label className="section-title block">Summary length</label>
        <div className="flex gap-2">
          {['short', 'medium', 'long'].map(opt => (
            <button
              key={opt}
              onClick={() => setSummaryLength(opt)}
              disabled={isLoading}
              className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors
                ${summaryLength === opt
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* ── Actions ──────────────────────────────────────────── */}
      <div className="flex gap-3">
        <button
          onClick={onSummarize}
          disabled={isLoading || (!inputText.trim() && !droppedFile)}
          className="btn-primary flex-1"
        >
          {isLoading
            ? <><Loader className="w-4 h-4 animate-spin" /> Analysing…</>
            : <><FileText className="w-4 h-4" /> Summarise</>
          }
        </button>
        <button onClick={handleClear} disabled={isLoading} className="btn-secondary">
          Clear
        </button>
      </div>
    </div>
  );
};

export default InputPanel;