import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle, Bookmark, BookmarkCheck, Eye, CheckCircle2, XCircle, Lightbulb } from 'lucide-react';
import { MCQQuestion } from '../types';

interface Props {
  questions: MCQQuestion[];
  bookmarks: Set<string>;
  onToggleBookmark: (id: string) => void;
  onSwitchMode: (mode: 'quiz' | 'review') => void;
}

export default function FlashcardMode({ questions, bookmarks, onToggleBookmark, onSwitchMode }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knownSet, setKnownSet] = useState<Set<string>>(new Set());
  const [unknownSet, setUnknownSet] = useState<Set<string>>(new Set());
  const [order, setOrder] = useState<number[]>(() => questions.map((_, i) => i));
  const [filterMode, setFilterMode] = useState<'all' | 'known' | 'unknown' | 'bookmarked'>('all');
  const [showHint, setShowHint] = useState(false);

  const filtered = useMemo(() => {
    return order.map(i => questions[i]).filter(q => {
      if (!q) return false;
      if (filterMode === 'known') return knownSet.has(q.id);
      if (filterMode === 'unknown') return unknownSet.has(q.id);
      if (filterMode === 'bookmarked') return bookmarks.has(q.id);
      return true;
    });
  }, [order, questions, filterMode, knownSet, unknownSet, bookmarks]);

  const current = filtered[currentIndex];

  const handleShuffle = () => {
    setOrder([...order].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setFlipped(false);
    setShowHint(false);
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setFlipped(false);
    setKnownSet(new Set());
    setUnknownSet(new Set());
    setShowHint(false);
    setOrder(questions.map((_, i) => i));
  };

  const handleKnow = () => {
    if (!current) return;
    setKnownSet(prev => new Set([...prev, current.id]));
    setUnknownSet(prev => { const s = new Set(prev); s.delete(current.id); return s; });
    goNext();
  };

  const handleDontKnow = () => {
    if (!current) return;
    setUnknownSet(prev => new Set([...prev, current.id]));
    setKnownSet(prev => { const s = new Set(prev); s.delete(current.id); return s; });
    goNext();
  };

  const goNext = () => {
    setFlipped(false);
    setShowHint(false);
    setCurrentIndex(prev => Math.min(prev + 1, filtered.length - 1));
  };

  const goPrev = () => {
    setFlipped(false);
    setShowHint(false);
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  };

  const progressPct = filtered.length > 0 ? Math.round(((knownSet.size) / filtered.length) * 100) : 0;

  if (filtered.length === 0 || !current) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 space-y-3">
        <p className="text-lg">No cards in this filter</p>
        <button onClick={() => setFilterMode('all')} className="text-indigo-400 hover:underline text-sm">Show all cards</button>
      </div>
    );
  }

  const correctAnswer = current.options.find(o => o.id === current.correctAnswer);

  return (
    <div className="space-y-5">
      {/* Stats & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {[
            { key: 'all', label: `All (${questions.length})` },
            { key: 'unknown', label: `Review (${unknownSet.size})` },
            { key: 'known', label: `Known (${knownSet.size})` },
            { key: 'bookmarked', label: `Saved (${bookmarks.size})` },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => { setFilterMode(key as any); setCurrentIndex(0); setFlipped(false); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${filterMode === key ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={handleShuffle} className="p-2 rounded-xl border border-slate-700 text-slate-400 hover:text-purple-400 hover:border-purple-500/50 transition-colors">
            <Shuffle className="w-4 h-4" />
          </button>
          <button onClick={handleReset} className="p-2 rounded-xl border border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-500/50 transition-colors">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={() => onSwitchMode('quiz')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/50 transition-colors text-sm">
            <Eye className="w-4 h-4" /> Quiz Mode
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Card {currentIndex + 1} / {filtered.length}</span>
          <span>{progressPct}% mastered</span>
        </div>
        <div className="flex gap-1 h-2">
          {filtered.slice(0, Math.min(filtered.length, 100)).map((q, i) => (
            <div key={q.id} className={`flex-1 rounded-full transition-all ${
              i === currentIndex ? 'bg-indigo-500' :
              knownSet.has(q.id) ? 'bg-green-500' :
              unknownSet.has(q.id) ? 'bg-red-500' : 'bg-slate-700'
            }`} />
          ))}
        </div>
      </div>

      {/* Flashcard */}
      <div className="relative" style={{ perspective: '1200px' }}>
        <div
          onClick={() => setFlipped(!flipped)}
          className="relative w-full cursor-pointer"
          style={{
            transformStyle: 'preserve-3d',
            transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            minHeight: '320px',
          }}
        >
          {/* Front */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-800/80 border border-slate-700 p-8 flex flex-col justify-between"
            style={{ backfaceVisibility: 'hidden' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                  current.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                  current.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>{current.difficulty}</span>
                <span className="text-xs text-slate-600">{current.chapter.slice(0, 30)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={e => { e.stopPropagation(); setShowHint(!showHint); }}
                  className={`p-1.5 rounded-lg border transition-colors ${showHint ? 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10' : 'text-slate-500 border-slate-700 hover:text-yellow-400'}`}>
                  <Lightbulb className="w-4 h-4" />
                </button>
                <button onClick={e => { e.stopPropagation(); onToggleBookmark(current.id); }}
                  className={`p-1.5 rounded-lg border transition-colors ${bookmarks.has(current.id) ? 'text-indigo-400 border-indigo-500/50' : 'text-slate-500 border-slate-700'}`}>
                  {bookmarks.has(current.id) ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center py-6 gap-4">
              <p className="text-xs uppercase tracking-widest text-indigo-400 font-semibold">Question</p>
              <p className="text-white text-xl leading-relaxed font-medium">{current.question}</p>
              {showHint && (
                <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-sm text-yellow-300 text-left">
                  <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
                  {current.hint}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 text-slate-600 text-xs">
              <span>Click to reveal answer</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Back */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-900/50 to-purple-900/30 border border-indigo-500/40 p-8 flex flex-col justify-between"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-indigo-400 font-semibold">Answer</p>
              <span className="text-xs text-slate-500">{current.pageRange}</span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center py-6 gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-green-300 text-2xl font-bold">{correctAnswer?.text}</p>
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-sm text-slate-400 text-left max-w-lg">
                <p className="font-medium text-slate-300 mb-1">Explanation:</p>
                <p>{current.explanation}</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-slate-600 text-xs">
              <span>Click to see question</span>
            </div>
          </div>
        </div>
      </div>

      {/* Know/Don't Know Buttons */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={goPrev} disabled={currentIndex === 0}
          className="flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-700 text-slate-400 hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft className="w-5 h-5" /> Prev
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={handleDontKnow}
            className="flex items-center justify-center gap-1.5 p-3 rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium">
            <XCircle className="w-4 h-4" /> Again
          </button>
          <button onClick={handleKnow}
            className="flex items-center justify-center gap-1.5 p-3 rounded-xl border border-green-500/40 bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" /> Got it
          </button>
        </div>
        <button onClick={goNext} disabled={currentIndex === filtered.length - 1}
          className="flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-700 text-slate-400 hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          Next <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
