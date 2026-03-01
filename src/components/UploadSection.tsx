import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload, FileText, AlertCircle, BookOpen, Settings2,
  ChevronDown, ChevronUp, Zap, Info
} from 'lucide-react';
import { AppSettings } from '../utils/storage';

interface Props {
  onFileAccepted: (file: File, settings: AppSettings) => void;
  settings: AppSettings;
  onSettingsChange: (s: AppSettings) => void;
  isProcessing: boolean;
}

export default function UploadSection({ onFileAccepted, settings, onSettingsChange, isProcessing }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dragError, setDragError] = useState('');

  const onDrop = useCallback((accepted: File[], rejected: any[]) => {
    setDragError('');
    if (rejected.length > 0) {
      setDragError('Only PDF files are supported. Please upload a .pdf file.');
      return;
    }
    if (accepted.length > 0) {
      onFileAccepted(accepted[0], settings);
    }
  }, [onFileAccepted, settings]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: isProcessing,
  });

  const totalPct = settings.easyPct + settings.mediumPct + settings.hardPct;
  const pctValid = totalPct === 100;

  const estimatedQ = Math.round(settings.questionsPerChunk * 120); // rough estimate

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          QuizForge
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto">
          Upload any PDF — textbooks, research papers, manuals — and instantly generate 1,200+ MCQ questions for studying, exams, or training.
        </p>
      </div>

      {/* Feature Pills */}
      <div className="flex flex-wrap justify-center gap-2">
        {['Up to 200MB', '1000+ Pages', '1200+ Questions', 'Flashcard Mode', 'Export CSV/Excel/PDF', 'Difficulty Levels'].map(f => (
          <span key={f} className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium">
            ✦ {f}
          </span>
        ))}
      </div>

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 group
          ${isDragActive && !isDragReject ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]' : ''}
          ${isDragReject || dragError ? 'border-red-500 bg-red-500/10' : ''}
          ${!isDragActive && !dragError ? 'border-slate-700 hover:border-indigo-500/60 hover:bg-slate-800/50 bg-slate-800/30' : ''}
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-4">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300
            ${isDragActive && !isDragReject ? 'bg-indigo-500/20 scale-110' : 'bg-slate-700/50 group-hover:bg-indigo-500/10 group-hover:scale-105'}
            ${isDragReject || dragError ? 'bg-red-500/20' : ''}
          `}>
            {isDragReject || dragError ? (
              <AlertCircle className="w-10 h-10 text-red-400" />
            ) : (
              <Upload className={`w-10 h-10 transition-colors ${isDragActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-indigo-400'}`} />
            )}
          </div>

          {isDragActive && !isDragReject ? (
            <div>
              <p className="text-indigo-300 text-xl font-semibold">Drop it here!</p>
              <p className="text-indigo-400/60 text-sm">Release to start processing</p>
            </div>
          ) : dragError ? (
            <div>
              <p className="text-red-400 text-lg font-semibold">{dragError}</p>
              <p className="text-red-400/60 text-sm">Please try again with a valid PDF</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-slate-200 text-xl font-semibold">
                Drop your PDF here
              </p>
              <p className="text-slate-500">or <span className="text-indigo-400 underline underline-offset-2">browse to upload</span></p>
              <div className="flex items-center justify-center gap-6 mt-4 text-xs text-slate-600">
                <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> PDF only</span>
                <span>•</span>
                <span>Up to 200MB</span>
                <span>•</span>
                <span>1000+ pages supported</span>
              </div>
            </div>
          )}
        </div>

        {/* Animated border glow */}
        {isDragActive && (
          <div className="absolute inset-0 rounded-2xl border-2 border-indigo-500 animate-pulse pointer-events-none" />
        )}
      </div>

      {/* Generation Settings */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-700/30 transition-colors"
        >
          <div className="flex items-center gap-2 text-slate-300 font-medium">
            <Settings2 className="w-4 h-4 text-indigo-400" />
            Generation Settings
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-2 py-1 rounded-full">
              ~{estimatedQ} questions estimated
            </span>
            {showAdvanced ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {showAdvanced && (
          <div className="px-6 pb-6 space-y-5 border-t border-slate-700/50 pt-5">
            {/* Questions per chunk */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  Questions per text chunk
                </label>
                <span className="text-indigo-400 font-bold text-lg">{settings.questionsPerChunk}</span>
              </div>
              <input
                type="range" min={2} max={15} value={settings.questionsPerChunk}
                onChange={e => onSettingsChange({ ...settings, questionsPerChunk: Number(e.target.value) })}
                className="w-full accent-indigo-500"
              />
              <div className="flex justify-between text-xs text-slate-600">
                <span>2 (faster)</span>
                <span>15 (more comprehensive)</span>
              </div>
            </div>

            {/* Difficulty Distribution */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-300">Difficulty Distribution</label>
                {!pctValid && (
                  <span className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Must sum to 100% (currently {totalPct}%)
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'easyPct', label: 'Easy', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' },
                  { key: 'mediumPct', label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
                  { key: 'hardPct', label: 'Hard', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
                ].map(({ key, label, color, bg }) => (
                  <div key={key} className={`rounded-xl border p-3 ${bg}`}>
                    <label className={`text-xs font-medium ${color}`}>{label}</label>
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="number" min={0} max={100}
                        value={settings[key as keyof AppSettings] as number}
                        onChange={e => onSettingsChange({ ...settings, [key]: Number(e.target.value) })}
                        className="w-full bg-transparent text-white text-lg font-bold focus:outline-none"
                      />
                      <span className={`${color} text-sm`}>%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Info box */}
            <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-700/30 rounded-xl p-3">
              <Info className="w-3.5 h-3.5 mt-0.5 text-slate-500 shrink-0" />
              <span>
                For a 1000-page book, expect ~240 text chunks at default settings (400 words/chunk).
                With 5 questions/chunk, that yields <strong className="text-slate-400">~1,200 questions</strong>.
                Increase the slider for denser coverage. Questions include definitions, fill-in-the-blank, factual recall, and numerical data.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
