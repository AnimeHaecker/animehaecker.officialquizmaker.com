import { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Bookmark, BookmarkCheck, Lightbulb,
  CheckCircle2, XCircle, SkipForward, Filter, Search, BarChart2,
  Shuffle, Eye, EyeOff, RotateCcw, Trophy, Target, Zap
} from 'lucide-react';
import { MCQQuestion, Difficulty, QuizFilters } from '../types';

interface Props {
  questions: MCQQuestion[];
  bookmarks: Set<string>;
  onToggleBookmark: (id: string) => void;
  onSwitchMode: (mode: 'flashcard' | 'review') => void;
}

const LETTERS = ['A', 'B', 'C', 'D'];

export default function QuizMode({ questions, bookmarks, onToggleBookmark, onSwitchMode }: Props) {
  const [filters, setFilters] = useState<QuizFilters>({
    difficulty: 'all', chapter: 'all', topic: '', searchQuery: '', onlyWrong: false, onlyBookmarked: false
  });
  const [showFilters, setShowFilters] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [hintShown, setHintShown] = useState<Record<string, boolean>>({});
  const [wrongAnswers, setWrongAnswers] = useState<Set<string>>(new Set());
  const [shuffled, setShuffled] = useState(false);
  const [questionOrder, setQuestionOrder] = useState<number[]>(() => questions.map((_, i) => i));

  const chapters = useMemo(() => ['all', ...Array.from(new Set(questions.map(q => q.chapter)))], [questions]);

  const filteredQuestions = useMemo(() => {
    let filtered = questionOrder.map(i => questions[i]).filter(Boolean);

    if (filters.difficulty !== 'all') filtered = filtered.filter(q => q.difficulty === filters.difficulty);
    if (filters.chapter !== 'all') filtered = filtered.filter(q => q.chapter === filters.chapter);
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(question =>
        question.question.toLowerCase().includes(q) || question.topic.toLowerCase().includes(q)
      );
    }
    if (filters.onlyBookmarked) filtered = filtered.filter(q => bookmarks.has(q.id));
    if (filters.onlyWrong) filtered = filtered.filter(q => wrongAnswers.has(q.id));

    return filtered;
  }, [questions, questionOrder, filters, bookmarks, wrongAnswers]);

  const currentQ = filteredQuestions[currentIndex];

  const stats = useMemo(() => {
    const answered = Object.keys(answers).filter(id => filteredQuestions.some(q => q.id === id));
    const correct = answered.filter(id => {
      const q = filteredQuestions.find(q => q.id === id);
      return q && answers[id] === q.correctAnswer;
    });
    return {
      answered: answered.length,
      correct: correct.length,
      wrong: answered.length - correct.length,
      total: filteredQuestions.length,
      accuracy: answered.length > 0 ? Math.round((correct.length / answered.length) * 100) : 0,
    };
  }, [answers, filteredQuestions]);

  const handleAnswer = useCallback((optionId: string) => {
    if (!currentQ || revealed[currentQ.id]) return;
    const isWrong = optionId !== currentQ.correctAnswer;
    setAnswers(prev => ({ ...prev, [currentQ.id]: optionId }));
    setRevealed(prev => ({ ...prev, [currentQ.id]: true }));
    if (isWrong) setWrongAnswers(prev => new Set([...prev, currentQ.id]));
  }, [currentQ, revealed]);

  const handleShuffle = () => {
    const order = [...questionOrder].sort(() => Math.random() - 0.5);
    setQuestionOrder(order);
    setCurrentIndex(0);
    setShuffled(true);
  };

  const handleReset = () => {
    setAnswers({});
    setRevealed({});
    setHintShown({});
    setWrongAnswers(new Set());
    setCurrentIndex(0);
    setQuestionOrder(questions.map((_, i) => i));
    setShuffled(false);
  };

  if (filteredQuestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 space-y-3">
        <Filter className="w-12 h-12 opacity-30" />
        <p className="text-lg">No questions match your filters</p>
        <button onClick={() => setFilters({ difficulty: 'all', chapter: 'all', topic: '', searchQuery: '', onlyWrong: false, onlyBookmarked: false })}
          className="text-indigo-400 hover:underline text-sm">Clear all filters</button>
      </div>
    );
  }

  const isAnswered = currentQ && revealed[currentQ.id];
  const selectedAnswer = currentQ && answers[currentQ.id];
  const isCorrect = currentQ && selectedAnswer === currentQ.correctAnswer;

  return (
    <div className="space-y-4">
      {/* Top Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-slate-300', icon: <Target className="w-4 h-4" /> },
          { label: 'Answered', value: stats.answered, color: 'text-blue-400', icon: <CheckCircle2 className="w-4 h-4" /> },
          { label: 'Correct', value: stats.correct, color: 'text-green-400', icon: <Trophy className="w-4 h-4" /> },
          { label: 'Accuracy', value: `${stats.accuracy}%`, color: 'text-indigo-400', icon: <Zap className="w-4 h-4" /> },
        ].map(s => (
          <div key={s.label} className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 flex items-center gap-3">
            <span className={s.color}>{s.icon}</span>
            <div>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={filters.searchQuery}
            onChange={e => { setFilters(f => ({ ...f, searchQuery: e.target.value })); setCurrentIndex(0); }}
            placeholder="Search questions..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${showFilters ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-indigo-500/50'}`}>
          <Filter className="w-4 h-4" /> Filters
        </button>
        <button onClick={handleShuffle}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:border-purple-500/50 text-sm font-medium transition-colors">
          <Shuffle className="w-4 h-4" /> Shuffle
        </button>
        <button onClick={handleReset}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:border-red-500/50 text-sm font-medium transition-colors">
          <RotateCcw className="w-4 h-4" /> Reset
        </button>
        <button onClick={() => onSwitchMode('flashcard')}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:border-yellow-500/50 text-sm font-medium transition-colors">
          <Eye className="w-4 h-4" /> Flashcard Mode
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Difficulty</label>
            <select value={filters.difficulty}
              onChange={e => { setFilters(f => ({ ...f, difficulty: e.target.value as any })); setCurrentIndex(0); }}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none">
              <option value="all">All</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Chapter</label>
            <select value={filters.chapter}
              onChange={e => { setFilters(f => ({ ...f, chapter: e.target.value })); setCurrentIndex(0); }}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none">
              {chapters.map(c => <option key={c} value={c}>{c === 'all' ? 'All Chapters' : c.slice(0, 30)}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3 col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={filters.onlyWrong}
                onChange={e => { setFilters(f => ({ ...f, onlyWrong: e.target.checked })); setCurrentIndex(0); }}
                className="accent-red-500" />
              <span className="text-sm text-slate-400">Wrong only</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={filters.onlyBookmarked}
                onChange={e => { setFilters(f => ({ ...f, onlyBookmarked: e.target.checked })); setCurrentIndex(0); }}
                className="accent-indigo-500" />
              <span className="text-sm text-slate-400">Bookmarked only</span>
            </label>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Question {currentIndex + 1} of {filteredQuestions.length}</span>
          <span>{Math.round(((currentIndex + 1) / filteredQuestions.length) * 100)}% through</span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / filteredQuestions.length) * 100}%` }} />
        </div>
      </div>

      {/* Question Card */}
      {currentQ && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl overflow-hidden">
          {/* Card Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide ${
                currentQ.difficulty === 'easy' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                currentQ.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>{currentQ.difficulty}</span>
              <span className="text-xs text-slate-600 bg-slate-700/50 px-2 py-1 rounded-lg truncate max-w-48">{currentQ.chapter}</span>
              <span className="text-xs text-slate-600">{currentQ.pageRange}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setHintShown(prev => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }))}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-colors border ${hintShown[currentQ.id] ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'border-slate-700 text-slate-500 hover:text-yellow-400 hover:border-yellow-500/30'}`}>
                <Lightbulb className="w-3.5 h-3.5" /> Hint
              </button>
              <button onClick={() => onToggleBookmark(currentQ.id)}
                className={`p-1.5 rounded-lg border transition-colors ${bookmarks.has(currentQ.id) ? 'text-indigo-400 border-indigo-500/50 bg-indigo-500/10' : 'text-slate-500 border-slate-700 hover:text-indigo-400'}`}>
                {bookmarks.has(currentQ.id) ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Hint */}
          {hintShown[currentQ.id] && (
            <div className="mx-6 mt-4 flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-sm text-yellow-300">
              <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{currentQ.hint}</span>
            </div>
          )}

          {/* Question */}
          <div className="px-6 py-5">
            <p className="text-white text-lg leading-relaxed font-medium">{currentQ.question}</p>
          </div>

          {/* Options */}
          <div className="px-6 pb-5 space-y-3">
            {currentQ.options.map((option, i) => {
              const isSelected = selectedAnswer === option.id;
              const isCorrectOption = option.id === currentQ.correctAnswer;
              let optionClass = 'border-slate-700 bg-slate-700/30 text-slate-300 hover:border-indigo-500/50 hover:bg-slate-700/50';

              if (isAnswered) {
                if (isCorrectOption) optionClass = 'border-green-500 bg-green-500/15 text-green-300';
                else if (isSelected) optionClass = 'border-red-500 bg-red-500/15 text-red-300';
                else optionClass = 'border-slate-700/50 bg-slate-800/50 text-slate-500 opacity-60';
              }

              return (
                <button key={option.id} onClick={() => handleAnswer(option.id)} disabled={!!isAnswered}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-200 ${optionClass} ${!isAnswered ? 'cursor-pointer' : 'cursor-default'}`}>
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                    isAnswered
                      ? isCorrectOption ? 'bg-green-500/30 text-green-300' : isSelected ? 'bg-red-500/30 text-red-300' : 'bg-slate-700 text-slate-600'
                      : 'bg-slate-700 text-slate-400'
                  }`}>{LETTERS[i]}</span>
                  <span className="flex-1 text-sm leading-relaxed">{option.text}</span>
                  {isAnswered && isCorrectOption && <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />}
                  {isAnswered && isSelected && !isCorrectOption && <XCircle className="w-5 h-5 text-red-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {isAnswered && (
            <div className={`mx-6 mb-5 p-4 rounded-xl border text-sm ${isCorrect ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
              <p className="font-semibold mb-1">{isCorrect ? '✓ Correct!' : '✗ Incorrect'}</p>
              <p className="text-sm opacity-90">{currentQ.explanation}</p>
            </div>
          )}

          {/* Navigation */}
          <div className="px-6 pb-6 flex items-center justify-between gap-3">
            <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm">
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            {!isAnswered && (
              <button onClick={() => { setRevealed(prev => ({ ...prev, [currentQ.id]: true })); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-slate-300 text-sm transition-colors">
                <EyeOff className="w-4 h-4" /> Skip
              </button>
            )}
            <button
              onClick={() => {
                if (currentIndex < filteredQuestions.length - 1) setCurrentIndex(currentIndex + 1);
              }}
              disabled={currentIndex === filteredQuestions.length - 1}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-medium">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
