import { FileText, Loader2, CheckCircle2, XCircle, ChevronRight, Clock, BarChart2 } from 'lucide-react';
import { ProcessingJob } from '../types';

interface Props {
  job: ProcessingJob;
  onCancel?: () => void;
}

const stages = [
  { key: 'extracting', label: 'Extracting Text', desc: 'Reading PDF pages with pdfjs-dist' },
  { key: 'chunking', label: 'Chunking', desc: 'Splitting into 400-word semantic segments' },
  { key: 'generating', label: 'Generating Questions', desc: 'Creating MCQs from each chunk' },
  { key: 'complete', label: 'Complete!', desc: 'All questions are ready' },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

export default function ProcessingPanel({ job, onCancel }: Props) {
  const stageIndex = stages.findIndex(s => s.key === job.status);
  const elapsed = Date.now() - job.startedAt;

  const extractionPct = job.status === 'extracting'
    ? Math.min(99, Math.floor((job.processedChunks / Math.max(job.totalChunks, 1)) * 100))
    : job.status !== 'idle' ? 100 : 0;

  const chunkPct = job.status === 'chunking' ? 50
    : job.status === 'generating' || job.status === 'complete' ? 100
    : job.status === 'extracting' ? 0 : 0;

  const genPct = job.status === 'generating'
    ? Math.min(99, Math.floor((job.processedChunks / Math.max(job.totalChunks, 1)) * 100))
    : job.status === 'complete' ? 100 : 0;

  const overallPct = job.status === 'complete' ? 100
    : job.status === 'extracting' ? Math.floor(extractionPct * 0.3)
    : job.status === 'chunking' ? 35
    : job.status === 'generating' ? 35 + Math.floor(genPct * 0.65)
    : 0;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* File Info */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate text-lg">{job.filename}</p>
            <div className="flex flex-wrap gap-4 mt-1 text-sm text-slate-400">
              <span>{formatBytes(job.fileSize)}</span>
              {job.totalPages > 0 && <span>{job.totalPages.toLocaleString()} pages</span>}
              {job.totalChunks > 0 && <span>{job.totalChunks.toLocaleString()} chunks</span>}
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {formatDuration(elapsed)}
              </span>
            </div>
          </div>
          {job.status !== 'complete' && job.status !== 'error' && onCancel && (
            <button onClick={onCancel} className="text-xs text-slate-500 hover:text-red-400 transition-colors border border-slate-600 hover:border-red-500/50 px-3 py-1.5 rounded-lg">
              Cancel
            </button>
          )}
        </div>

        {/* Overall Progress */}
        <div className="mt-5 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Overall Progress</span>
            <span className={`font-bold ${job.status === 'complete' ? 'text-green-400' : job.status === 'error' ? 'text-red-400' : 'text-indigo-400'}`}>
              {overallPct}%
            </span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                job.status === 'complete' ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                : job.status === 'error' ? 'bg-red-500'
                : 'bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse'
              }`}
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stage Tracker */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-5">Processing Pipeline</h3>
        <div className="space-y-4">
          {stages.map((stage, idx) => {
            const isDone = stageIndex > idx || job.status === 'complete';
            const isActive = stage.key === job.status;
            const isPending = stageIndex < idx && job.status !== 'complete';

            return (
              <div key={stage.key} className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
                isActive ? 'bg-indigo-500/10 border border-indigo-500/30' :
                isDone ? 'bg-green-500/5 border border-green-500/20' :
                'bg-slate-700/20 border border-transparent'
              }`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm transition-all ${
                  isDone ? 'bg-green-500/20 text-green-400' :
                  isActive ? 'bg-indigo-500/20 text-indigo-400' :
                  'bg-slate-700 text-slate-600'
                }`}>
                  {isDone ? <CheckCircle2 className="w-5 h-5" /> :
                   isActive ? <Loader2 className="w-5 h-5 animate-spin" /> :
                   <span>{idx + 1}</span>}
                </div>
                <div className="flex-1">
                  <p className={`font-medium text-sm ${isDone ? 'text-green-400' : isActive ? 'text-indigo-300' : 'text-slate-600'}`}>
                    {stage.label}
                  </p>
                  <p className="text-xs text-slate-600">{stage.desc}</p>
                </div>
                {isActive && stage.key === 'generating' && job.totalChunks > 0 && (
                  <div className="text-right">
                    <p className="text-indigo-400 font-bold">{job.processedChunks}/{job.totalChunks}</p>
                    <p className="text-xs text-slate-600">chunks</p>
                  </div>
                )}
                {!isPending && !isActive && idx < stageIndex && (
                  <ChevronRight className="w-4 h-4 text-green-500/50" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Stats */}
      {job.totalQuestions > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Questions Generated', value: job.totalQuestions.toLocaleString(), color: 'text-indigo-400', icon: '❓' },
            { label: 'Chunks Processed', value: `${job.processedChunks}/${job.totalChunks}`, color: 'text-purple-400', icon: '📦' },
            { label: 'Est. Remaining', value: job.status === 'complete' ? 'Done!' : `~${Math.max(0, Math.round((job.totalChunks - job.processedChunks) * 0.15))}s`, color: 'text-pink-400', icon: '⏳' },
          ].map(stat => (
            <div key={stat.label} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-center">
              <p className="text-2xl mb-1">{stat.icon}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {job.status === 'error' && job.error && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium">Processing Failed</p>
            <p className="text-red-400/70 text-sm mt-1">{job.error}</p>
          </div>
        </div>
      )}

      {/* Architecture Info */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-5 text-sm text-slate-500 space-y-2">
        <p className="text-slate-400 font-medium flex items-center gap-2"><BarChart2 className="w-4 h-4 text-indigo-400" /> How It Works</p>
        <ul className="space-y-1 text-xs">
          <li>1. <strong className="text-slate-400">PDF Extraction</strong> – pdfjs-dist reads pages in batches of 10 (handles 200MB+ files)</li>
          <li>2. <strong className="text-slate-400">Chapter Detection</strong> – Regex patterns identify chapter boundaries automatically</li>
          <li>3. <strong className="text-slate-400">Chunking</strong> – 400-word chunks with 50-word overlap for context continuity</li>
          <li>4. <strong className="text-slate-400">NLP Generation</strong> – Definition extraction, sentence completion, factual recall & numerical questions</li>
          <li>5. <strong className="text-slate-400">Deduplication</strong> – Jaccard similarity prevents duplicate questions</li>
        </ul>
      </div>
    </div>
  );
}
