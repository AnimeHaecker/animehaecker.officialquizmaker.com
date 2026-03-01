import { useState, useCallback, useEffect } from 'react';
import {
  BookOpen, Brain, Eye, RotateCcw, Download, Upload,
  CheckCircle2, Layers, GraduationCap, ChevronRight, X
} from 'lucide-react';
import UploadSection from './components/UploadSection';
import ProcessingPanel from './components/ProcessingPanel';
import QuizMode from './components/QuizMode';
import FlashcardMode from './components/FlashcardMode';
import ReviewMode from './components/ReviewMode';
import { MCQQuestion, ProcessingJob } from './types';
import { extractTextFromPDF } from './utils/pdfExtractor';
import { chunkPages } from './utils/textChunker';
import { generateQuestionsFromChunks, DEFAULT_CONFIG } from './utils/questionGenerator';
import { saveQuestions, loadQuestions, clearQuestions, loadBookmarks, toggleBookmark, loadSettings, saveSettings, AppSettings } from './utils/storage';
import { exportToCSV, exportToExcel, exportToPDF } from './utils/exportUtils';
import { v4 as uuidv4 } from 'uuid';

type AppView = 'upload' | 'processing' | 'quiz' | 'flashcard' | 'review';

export default function App() {
  const [view, setView] = useState<AppView>('upload');
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [job, setJob] = useState<ProcessingJob | null>(null);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [activeTab, setActiveTab] = useState<'quiz' | 'flashcard' | 'review'>('quiz');
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(true);

  // Load persisted data
  useEffect(() => {
    const saved = loadQuestions();
    if (saved.length > 0) {
      setQuestions(saved);
      setView('quiz');
    }
    setBookmarks(loadBookmarks());
  }, []);

  const handleSettingsChange = useCallback((s: AppSettings) => {
    setSettings(s);
    saveSettings(s);
  }, []);

  const handleToggleBookmark = useCallback((id: string) => {
    setBookmarks(prev => toggleBookmark(id, prev));
  }, []);

  const handleFileAccepted = useCallback(async (file: File, currentSettings: AppSettings) => {
    const jobId = uuidv4();
    const newJob: ProcessingJob = {
      id: jobId,
      filename: file.name,
      fileSize: file.size,
      totalPages: 0,
      totalChunks: 0,
      processedChunks: 0,
      totalQuestions: 0,
      status: 'extracting',
      startedAt: Date.now(),
    };
    setJob(newJob);
    setView('processing');
    setQuestions([]);
    clearQuestions();

    try {
      // Phase 1: Extract
      const result = await extractTextFromPDF(file, (current, total) => {
        setJob(prev => prev ? { ...prev, totalPages: total, processedChunks: current, totalChunks: total } : prev);
      });

      if (result.pages.length === 0) {
        throw new Error('No text could be extracted from this PDF. It may be a scanned image-only PDF.');
      }

      // Phase 2: Chunk
      setJob(prev => prev ? { ...prev, status: 'chunking', processedChunks: 0 } : prev);
      await new Promise(r => setTimeout(r, 100));

      const chunks = chunkPages(result.pages);

      setJob(prev => prev ? {
        ...prev,
        status: 'generating',
        totalChunks: chunks.length,
        processedChunks: 0,
        totalPages: result.totalPages,
      } : prev);

      // Phase 3: Generate
      const config = {
        questionsPerChunk: currentSettings.questionsPerChunk,
        difficultyDistribution: {
          easy: currentSettings.easyPct,
          medium: currentSettings.mediumPct,
          hard: currentSettings.hardPct,
        },
      };

      const allQuestions: MCQQuestion[] = [];

      await generateQuestionsFromChunks(chunks, config, (done, total, newQs) => {
        allQuestions.push(...newQs);
        setJob(prev => prev ? {
          ...prev,
          processedChunks: done,
          totalChunks: total,
          totalQuestions: allQuestions.length,
        } : prev);
        // Live update questions
        if (done % 5 === 0 || done === total) {
          const snapshot = [...allQuestions];
          setQuestions(snapshot);
        }
      });

      // Save
      saveQuestions(allQuestions);
      setQuestions(allQuestions);

      setJob(prev => prev ? {
        ...prev,
        status: 'complete',
        totalQuestions: allQuestions.length,
        processedChunks: chunks.length,
        completedAt: Date.now(),
      } : prev);

      // Auto-navigate after 2s
      setTimeout(() => {
        setView('quiz');
        setActiveTab('quiz');
      }, 2000);

    } catch (err: any) {
      setJob(prev => prev ? {
        ...prev,
        status: 'error',
        error: err?.message || 'An unexpected error occurred during processing.',
      } : prev);
    }
  }, []);

  const handleReset = () => {
    clearQuestions();
    setQuestions([]);
    setJob(null);
    setView('upload');
    setBookmarks(new Set());
  };

  const navTabs = [
    { id: 'quiz', label: 'Quiz Mode', icon: <Brain className="w-4 h-4" />, color: 'indigo' },
    { id: 'flashcard', label: 'Flashcards', icon: <Layers className="w-4 h-4" />, color: 'purple' },
    { id: 'review', label: 'Review All', icon: <Eye className="w-4 h-4" />, color: 'blue' },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-purple-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-600/5 rounded-full blur-3xl" />
      </div>

      {/* Nav */}
      {view !== 'upload' && view !== 'processing' && (
        <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2.5 mr-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white text-sm">QuizForge</span>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 flex-1">
              {navTabs.map(tab => (
                <button key={tab.id} onClick={() => { setActiveTab(tab.id); setView('quiz'); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-800/60 border border-slate-700 px-3 py-1.5 rounded-lg">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-slate-300 font-medium">{questions.length.toLocaleString()}</span> Q's
                <span className="mx-1 text-slate-700">·</span>
                <span className="text-indigo-400">{bookmarks.size}</span> saved
              </div>

              {/* Quick export */}
              <div className="flex gap-1">
                <button onClick={() => exportToCSV(questions)}
                  className="px-2 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-green-400 hover:border-green-500/50 text-xs transition-colors" title="Export CSV">
                  CSV
                </button>
                <button onClick={() => exportToExcel(questions)}
                  className="px-2 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-blue-400 hover:border-blue-500/50 text-xs transition-colors" title="Export Excel">
                  XLS
                </button>
                <button onClick={() => exportToPDF(questions)}
                  className="px-2 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-500/50 text-xs transition-colors" title="Export PDF">
                  PDF
                </button>
              </div>

              <button onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-xs transition-colors">
                <Upload className="w-3.5 h-3.5" /> New PDF
              </button>
            </div>
          </div>
        </nav>
      )}

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Upload View */}
        {view === 'upload' && (
          <div className="flex flex-col items-center justify-center min-h-[80vh]">
            {/* Architecture Info Banner */}
            {showWelcomeBanner && (
              <div className="w-full max-w-4xl mb-8 bg-gradient-to-r from-indigo-900/40 to-purple-900/30 border border-indigo-500/30 rounded-2xl p-5 relative">
                <button onClick={() => setShowWelcomeBanner(false)}
                  className="absolute top-3 right-3 text-slate-500 hover:text-slate-300">
                  <X className="w-4 h-4" />
                </button>
                <p className="text-indigo-300 font-semibold text-sm mb-3 flex items-center gap-2">
                  <ChevronRight className="w-4 h-4" /> Architecture & Tech Stack
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {[
                    { title: 'Frontend', stack: 'React + Vite + Tailwind CSS', icon: '⚛️' },
                    { title: 'PDF Parsing', stack: 'pdfjs-dist (batch processing, 200MB+)', icon: '📄' },
                    { title: 'NLP Engine', stack: 'Custom regex NLP (no AI cost)', icon: '🧠' },
                    { title: 'Export', stack: 'Papa Parse, SheetJS, jsPDF', icon: '📤' },
                    { title: 'Storage', stack: 'LocalStorage chunked (1200+ Q)', icon: '💾' },
                    { title: 'Chunking', stack: '400-word sliding window + overlap', icon: '📦' },
                    { title: 'Q Types', stack: 'Fill-blank, Def, Factual, Numerical', icon: '❓' },
                    { title: 'Scalability', stack: 'Batched async, yield to UI thread', icon: '⚡' },
                  ].map(({ title, stack, icon }) => (
                    <div key={title} className="bg-slate-800/60 rounded-lg p-2.5">
                      <p className="text-base mb-1">{icon}</p>
                      <p className="text-indigo-300 font-medium">{title}</p>
                      <p className="text-slate-500">{stack}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <UploadSection
              onFileAccepted={handleFileAccepted}
              settings={settings}
              onSettingsChange={handleSettingsChange}
              isProcessing={false}
            />
          </div>
        )}

        {/* Processing View */}
        {view === 'processing' && job && (
          <div className="flex flex-col items-center justify-center min-h-[80vh]">
            <ProcessingPanel
              job={job}
              onCancel={() => { setJob(null); setView('upload'); }}
            />
            {job.status === 'complete' && (
              <button onClick={() => { setView('quiz'); setActiveTab('quiz'); }}
                className="mt-6 flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/30">
                <CheckCircle2 className="w-5 h-5" />
                Start Quiz ({questions.length.toLocaleString()} questions)
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {job.status === 'error' && (
              <button onClick={() => { setJob(null); setView('upload'); }}
                className="mt-6 flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors">
                <RotateCcw className="w-5 h-5" /> Try Again
              </button>
            )}
          </div>
        )}

        {/* Quiz/Flashcard/Review Views */}
        {view === 'quiz' && questions.length > 0 && (
          <div>
            {/* Stats header */}
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold text-white">
                {activeTab === 'quiz' ? '🧠 Quiz Mode' : activeTab === 'flashcard' ? '🃏 Flashcard Mode' : '📋 Review All Questions'}
              </h2>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: `${questions.filter(q => q.difficulty === 'easy').length} Easy`, cls: 'bg-green-500/15 text-green-400 border border-green-500/30' },
                  { label: `${questions.filter(q => q.difficulty === 'medium').length} Medium`, cls: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30' },
                  { label: `${questions.filter(q => q.difficulty === 'hard').length} Hard`, cls: 'bg-red-500/15 text-red-400 border border-red-500/30' },
                  { label: `${bookmarks.size} Bookmarked`, cls: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30' },
                ].map(({ label, cls }) => (
                  <span key={label} className={`px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>{label}</span>
                ))}
              </div>
            </div>

            {activeTab === 'quiz' && (
              <QuizMode
                questions={questions}
                bookmarks={bookmarks}
                onToggleBookmark={handleToggleBookmark}
                onSwitchMode={(mode) => { setActiveTab(mode); }}
              />
            )}
            {activeTab === 'flashcard' && (
              <FlashcardMode
                questions={questions}
                bookmarks={bookmarks}
                onToggleBookmark={handleToggleBookmark}
                onSwitchMode={(mode) => { setActiveTab(mode); }}
              />
            )}
            {activeTab === 'review' && (
              <ReviewMode
                questions={questions}
                bookmarks={bookmarks}
                onToggleBookmark={handleToggleBookmark}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/50 mt-12 py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <GraduationCap className="w-3 h-3 text-white" />
            </div>
            <span>QuizForge — PDF to MCQ, entirely in your browser. No data leaves your device.</span>
          </div>
          <div className="flex items-center gap-4">
            <span>React + Vite + Tailwind CSS</span>
            <span>·</span>
            <span>pdfjs-dist for extraction</span>
            <span>·</span>
            <span>SheetJS + jsPDF for export</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
