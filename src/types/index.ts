export type Difficulty = 'easy' | 'medium' | 'hard';

export interface MCQOption {
  id: string;
  text: string;
}

export interface MCQQuestion {
  id: string;
  question: string;
  options: MCQOption[];
  correctAnswer: string; // option id
  explanation: string;
  hint: string;
  chapter: string;
  topic: string;
  difficulty: Difficulty;
  pageRange: string;
  chunkIndex: number;
  createdAt: number;
}

export interface TextChunk {
  index: number;
  text: string;
  pageRange: string;
  chapter: string;
  wordCount: number;
}

export interface ProcessingJob {
  id: string;
  filename: string;
  fileSize: number;
  totalPages: number;
  totalChunks: number;
  processedChunks: number;
  totalQuestions: number;
  status: 'idle' | 'extracting' | 'chunking' | 'generating' | 'complete' | 'error';
  error?: string;
  startedAt: number;
  completedAt?: number;
}

export interface QuizSession {
  id: string;
  questions: MCQQuestion[];
  currentIndex: number;
  answers: Record<string, string>;
  revealed: Record<string, boolean>;
  hintUsed: Record<string, boolean>;
  startedAt: number;
  completedAt?: number;
  mode: 'quiz' | 'flashcard' | 'review';
  filters: QuizFilters;
}

export interface QuizFilters {
  difficulty: Difficulty | 'all';
  chapter: string;
  topic: string;
  searchQuery: string;
  onlyWrong: boolean;
  onlyBookmarked: boolean;
}

export interface QuizStats {
  totalAnswered: number;
  correct: number;
  wrong: number;
  skipped: number;
  accuracy: number;
  byDifficulty: Record<Difficulty, { correct: number; total: number }>;
  byChapter: Record<string, { correct: number; total: number }>;
  hintsUsed: number;
  averageTimePerQuestion: number;
}

export interface BookmarkedQuestion {
  questionId: string;
  addedAt: number;
}
