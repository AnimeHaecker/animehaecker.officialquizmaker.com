import { useState, useMemo } from 'react';
import { Search, Filter, Download, Grid3X3, List, BookmarkCheck, Bookmark, ChevronDown, ChevronUp, BarChart2 } from 'lucide-react';
import { MCQQuestion, Difficulty } from '../types';
import { exportToCSV, exportToExcel, exportToPDF } from '../utils/exportUtils';

interface Props {
  questions: MCQQuestion[];
  bookmarks: Set<string>;
  onToggleBookmark: (id: string) => void;
}

const LETTERS = ['A', 'B', 'C', 'D'];
const PAGE_SIZE = 50;

export default function ReviewMode({ questions, bookmarks, onToggleBookmark }: Props) {
  const [search, setSearch] = useState('');
  const [diffFilter, setDiffFilter] = useState<Difficulty | 'all'>('all');
  const [chapterFilter, setChapterFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'chapter' | 'difficulty' | 'topic'>('chapter');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const chapters = useMemo(() => ['all', ...Array.from(new Set(questions.map(q => q.chapter))).sort()], [questions]);

  const filtered = useMemo(() => {
    let q = [...questions];
    if (search) {
      const s = search.toLowerCase();
      q = q.filter(x => x.question.toLowerCase().includes(s) || x.topic.toLowerCase().includes(s) || x.chapter.toLowerCase().includes(s));
    }
    if (diffFilter !== 'all') q = q.filter(x => x.difficulty === diffFilter);
    if (chapterFilter !== 'all') q = q.filter(x => x.chapter === chapterFilter);
    q.sort((a, b) => {
      if (sortBy === 'difficulty') {
        const order: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };
        return order[a.difficulty] - order[b.difficulty];
      }
      if (sortBy === 'topic') return a.topic.localeCompare(b.topic);
      return a.chapter.localeCompare(b.chapter);
    });
    return q;
  }, [questions, search, diffFilter, chapterFilter, sortBy]);

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // Stats
  const stats = useMemo(() => {
    const byDiff: Record<string, number> = { easy: 0, medium: 0, hard: 0 };
    const byChapter: Record<string, number> = {};
    questions.forEach(q => {
      byDiff[q.difficulty]++;
      byChapter[q.chapter] = (byChapter[q.chapter] || 0) + 1;
    });
    return { byDiff, byChapter };
  }, [questions]);

  const topChapters = Object.entries(stats.byChapter).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search questions, topics, chapters..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500" />
        </div>

        <select value={diffFilter} onChange={e => { setDiffFilter(e.target.value as any); setPage(0); }}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500">
          <option value="all">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        <select value={chapterFilter} onChange={e => { setChapterFilter(e.target.value); setPage(0); }}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 max-w-48">
          {chapters.map(c => <option key={c} value={c}>{c === 'all' ? 'All Chapters' : c.slice(0, 25)}</option>)}
        </select>

        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500">
          <option value="chapter">Sort: Chapter</option>
          <option value="difficulty">Sort: Difficulty</option>
          <option value="topic">Sort: Topic</option>
        </select>

        <div className="flex gap-1">
          <button onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg border transition-colors ${viewMode === 'list' ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'border-slate-700 text-slate-500 hover:text-slate-300'}`}>
            <List className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg border transition-colors ${viewMode === 'grid' ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'border-slate-700 text-slate-500 hover:text-slate-300'}`}>
            <Grid3X3 className="w-4 h-4" />
          </button>
        </div>

        <div className="relative">
          <button onClick={() => setShowExport(!showExport)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-sm font-medium transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
          {showExport && (
            <div className="absolute right-0 top-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-10 overflow-hidden w-44">
              {[
                { label: '📄 Export CSV', fn: () => exportToCSV(filtered, 'quizforge_questions.csv') },
                { label: '📊 Export Excel', fn: () => exportToExcel(filtered, 'quizforge_questions.xlsx') },
                { label: '📕 Export PDF', fn: () => exportToPDF(filtered, 'QuizForge Questions', 'quizforge_questions.pdf') },
                { label: '🔖 Bookmarked CSV', fn: () => exportToCSV(filtered.filter(q => bookmarks.has(q.id)), 'bookmarked.csv') },
              ].map(({ label, fn }) => (
                <button key={label} onClick={() => { fn(); setShowExport(false); }}
                  className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors">
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={() => setShowStats(!showStats)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${showStats ? 'bg-purple-500/20 border-purple-500/50 text-purple-300' : 'border-slate-700 text-slate-400 hover:border-purple-500/50'}`}>
          <BarChart2 className="w-4 h-4" /> Stats
        </button>
      </div>

      {/* Stats Panel */}
      {showStats && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-semibold text-slate-400 mb-3">By Difficulty</p>
            <div className="space-y-2">
              {[
                { key: 'easy', label: 'Easy', color: 'bg-green-500', textColor: 'text-green-400' },
                { key: 'medium', label: 'Medium', color: 'bg-yellow-500', textColor: 'text-yellow-400' },
                { key: 'hard', label: 'Hard', color: 'bg-red-500', textColor: 'text-red-400' },
              ].map(({ key, label, color, textColor }) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className={textColor}>{label}</span>
                    <span className="text-slate-400">{stats.byDiff[key]} ({Math.round((stats.byDiff[key] / questions.length) * 100)}%)</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${(stats.byDiff[key] / questions.length) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-400 mb-3">Top Chapters by Questions</p>
            <div className="space-y-2">
              {topChapters.map(([ch, count]) => (
                <div key={ch} className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 flex-1 truncate">{ch}</span>
                  <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(count / topChapters[0][1]) * 100}%` }} />
                  </div>
                  <span className="text-slate-500 w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing <span className="text-slate-300 font-medium">{filtered.length.toLocaleString()}</span> of <span className="text-slate-300 font-medium">{questions.length.toLocaleString()}</span> questions
        </p>
        <p className="text-xs text-slate-600">Page {page + 1} / {totalPages}</p>
      </div>

      {/* Questions List */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'space-y-3'}>
        {paginated.map((q, i) => {
          const correctOpt = q.options.find(o => o.id === q.correctAnswer);
          const correctLetter = LETTERS[q.options.findIndex(o => o.id === q.correctAnswer)];
          const isExpanded = expandedId === q.id;

          return (
            <div key={q.id} className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition-colors">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xs text-slate-600 mt-1 shrink-0 w-8">#{page * PAGE_SIZE + i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-bold uppercase ${
                        q.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                        q.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>{q.difficulty}</span>
                      <span className="text-xs text-slate-600 truncate max-w-32">{q.chapter}</span>
                      <span className="text-xs text-slate-700">{q.pageRange}</span>
                    </div>
                    <p className="text-slate-200 text-sm leading-relaxed font-medium">{q.question}</p>

                    {/* Options preview */}
                    {viewMode === 'list' && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {q.options.map((opt, oi) => (
                          <div key={opt.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
                            opt.id === q.correctAnswer ? 'bg-green-500/15 border border-green-500/30 text-green-300' : 'bg-slate-700/40 text-slate-500'
                          }`}>
                            <span className={`font-bold w-4 ${opt.id === q.correctAnswer ? 'text-green-400' : 'text-slate-600'}`}>{LETTERS[oi]}</span>
                            <span className="truncate">{opt.text}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {viewMode === 'grid' && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-lg">
                          {correctLetter}) {correctOpt?.text?.slice(0, 40)}{(correctOpt?.text?.length || 0) > 40 ? '...' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => onToggleBookmark(q.id)}
                      className={`p-1.5 rounded-lg border transition-colors ${bookmarks.has(q.id) ? 'text-indigo-400 border-indigo-500/50 bg-indigo-500/10' : 'text-slate-600 border-slate-700 hover:text-indigo-400'}`}>
                      {bookmarks.has(q.id) ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => setExpandedId(isExpanded ? null : q.id)}
                      className="p-1.5 rounded-lg border border-slate-700 text-slate-600 hover:text-slate-300 transition-colors">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded: Explanation & Hint */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-2 border-t border-slate-700/50 pt-3">
                  <div className="bg-slate-700/30 rounded-lg p-3 text-xs">
                    <p className="text-indigo-400 font-semibold mb-1">💡 Explanation</p>
                    <p className="text-slate-400">{q.explanation}</p>
                  </div>
                  <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 text-xs">
                    <p className="text-yellow-400 font-semibold mb-1">🔍 Hint</p>
                    <p className="text-yellow-300/70">{q.hint}</p>
                  </div>
                  <p className="text-xs text-slate-700">Topic: {q.topic}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
            className="px-3 py-2 rounded-lg border border-slate-700 text-slate-400 text-sm disabled:opacity-30 hover:border-slate-500 transition-colors">
            ← Prev
          </button>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              const pageNum = totalPages <= 7 ? i : page <= 3 ? i : page >= totalPages - 4 ? totalPages - 7 + i : page - 3 + i;
              return (
                <button key={pageNum} onClick={() => setPage(pageNum)}
                  className={`w-9 h-9 rounded-lg text-sm transition-colors ${pageNum === page ? 'bg-indigo-600 text-white' : 'border border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                  {pageNum + 1}
                </button>
              );
            })}
          </div>
          <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page === totalPages - 1}
            className="px-3 py-2 rounded-lg border border-slate-700 text-slate-400 text-sm disabled:opacity-30 hover:border-slate-500 transition-colors">
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
