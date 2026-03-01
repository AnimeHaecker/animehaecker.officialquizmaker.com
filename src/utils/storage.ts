import { MCQQuestion, QuizSession, ProcessingJob } from '../types';

const STORAGE_KEYS = {
  QUESTIONS: 'quizforge_questions',
  SESSIONS: 'quizforge_sessions',
  JOBS: 'quizforge_jobs',
  BOOKMARKS: 'quizforge_bookmarks',
  SETTINGS: 'quizforge_settings',
};

// ─── Questions ────────────────────────────────────────────────────────────────

export function saveQuestions(questions: MCQQuestion[]): void {
  try {
    // Store in chunks of 200 to handle localStorage limits
    const CHUNK = 200;
    const keys: string[] = [];
    for (let i = 0; i < questions.length; i += CHUNK) {
      const key = `${STORAGE_KEYS.QUESTIONS}_chunk_${i / CHUNK}`;
      localStorage.setItem(key, JSON.stringify(questions.slice(i, i + CHUNK)));
      keys.push(key);
    }
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(keys));
  } catch (e) {
    console.warn('LocalStorage quota exceeded, storing without persistence');
  }
}

export function loadQuestions(): MCQQuestion[] {
  try {
    const keysRaw = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
    if (!keysRaw) return [];
    const keys: string[] = JSON.parse(keysRaw);
    const all: MCQQuestion[] = [];
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (raw) all.push(...JSON.parse(raw));
    }
    return all;
  } catch {
    return [];
  }
}

export function clearQuestions(): void {
  try {
    const keysRaw = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
    if (keysRaw) {
      const keys: string[] = JSON.parse(keysRaw);
      keys.forEach(k => localStorage.removeItem(k));
    }
    localStorage.removeItem(STORAGE_KEYS.QUESTIONS);
  } catch {/* ignore */}
}

// ─── Bookmarks ────────────────────────────────────────────────────────────────

export function loadBookmarks(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function saveBookmarks(bookmarks: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify([...bookmarks]));
  } catch {/* ignore */}
}

export function toggleBookmark(questionId: string, bookmarks: Set<string>): Set<string> {
  const newSet = new Set(bookmarks);
  if (newSet.has(questionId)) {
    newSet.delete(questionId);
  } else {
    newSet.add(questionId);
  }
  saveBookmarks(newSet);
  return newSet;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface AppSettings {
  questionsPerChunk: number;
  easyPct: number;
  mediumPct: number;
  hardPct: number;
  theme: 'dark' | 'light';
}

export const DEFAULT_SETTINGS: AppSettings = {
  questionsPerChunk: 5,
  easyPct: 30,
  mediumPct: 50,
  hardPct: 20,
  theme: 'dark',
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch {/* ignore */}
}
