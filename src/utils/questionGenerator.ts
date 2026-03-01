import { MCQQuestion, Difficulty, TextChunk } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface GenerationConfig {
  questionsPerChunk: number;
  difficultyDistribution: Record<Difficulty, number>; // percentages summing to 100
}

export const DEFAULT_CONFIG: GenerationConfig = {
  questionsPerChunk: 5,
  difficultyDistribution: { easy: 30, medium: 50, hard: 20 },
};

// ─── NLP Helpers ─────────────────────────────────────────────────────────────

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 40 && s.split(' ').length > 6);
}

function extractKeyPhrases(text: string): string[] {
  // Extract noun phrases / key terms using simple heuristics
  const phrases: string[] = [];

  // Named entities: capitalized multi-word phrases
  const namedEntityPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4})\b/g;
  let match;
  while ((match = namedEntityPattern.exec(text)) !== null) {
    if (!phrases.includes(match[1]) && match[1].split(' ').length >= 2) {
      phrases.push(match[1]);
    }
  }

  // Definitions: "X is defined as Y", "X refers to Y", "X means Y"
  const defPattern = /\b(\w[\w\s]{2,30})\s+(?:is|are|was|were|refers to|means|denotes|represents)\s+([^.]{10,80})/gi;
  while ((match = defPattern.exec(text)) !== null) {
    const term = match[1].trim();
    if (term.split(' ').length <= 5 && !phrases.includes(term)) {
      phrases.push(term);
    }
  }

  return phrases.slice(0, 30);
}

function extractDefinitionPairs(text: string): Array<{ term: string; definition: string }> {
  const pairs: Array<{ term: string; definition: string }> = [];
  const patterns = [
    /([A-Z][\w\s]{2,30})\s+(?:is|are)\s+defined as\s+([^.]{15,120})/gi,
    /([A-Z][\w\s]{2,30})\s+(?:refers to|means)\s+([^.]{15,120})/gi,
    /([A-Z][\w\s]{2,30})\s+is\s+(?:a|an|the)\s+([^.]{15,120})/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const term = match[1].trim();
      const def = match[2].trim();
      if (
        term.length > 3 &&
        term.length < 60 &&
        def.length > 15 &&
        !pairs.some(p => p.term === term)
      ) {
        pairs.push({ term, definition: def });
      }
    }
  }

  return pairs.slice(0, 10);
}

function extractNumbers(text: string): Array<{ context: string; value: string }> {
  const results: Array<{ context: string; value: string }> = [];
  const pattern = /([^.]{0,60})\b(\d[\d,]*\.?\d*\s*(?:%|percent|million|billion|km|kg|meters?|years?|century|centuries)?)\b([^.]{0,60})/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const context = (match[1] + '___' + match[3]).trim();
    if (context.length > 20) {
      results.push({ context, value: match[2].trim() });
    }
  }
  return results.slice(0, 5);
}

// ─── Distractor Generation ────────────────────────────────────────────────────

function generateDistractors(correctAnswer: string, text: string, count: number = 3): string[] {
  const phrases = extractKeyPhrases(text);
  const sentences = splitSentences(text);
  const distractors: string[] = [];

  // Strategy 1: Use other key phrases
  const shuffled = phrases.sort(() => Math.random() - 0.5);
  for (const phrase of shuffled) {
    if (distractors.length >= count) break;
    if (phrase !== correctAnswer && phrase.length > 4 && !correctAnswer.includes(phrase)) {
      distractors.push(phrase);
    }
  }

  // Strategy 2: Mutate numbers in the correct answer
  if (distractors.length < count) {
    const numMatch = correctAnswer.match(/\d+/);
    if (numMatch) {
      const num = parseInt(numMatch[0]);
      const mutations = [num + Math.ceil(num * 0.2), num - Math.ceil(num * 0.15), num * 2, Math.round(num / 2)];
      for (const mutated of mutations) {
        if (distractors.length >= count) break;
        const distractor = correctAnswer.replace(numMatch[0], String(mutated));
        if (!distractors.includes(distractor)) {
          distractors.push(distractor);
        }
      }
    }
  }

  // Strategy 3: Extract fragments from other sentences
  if (distractors.length < count) {
    const otherSentences = sentences
      .filter(s => !s.includes(correctAnswer.slice(0, 20)))
      .sort(() => Math.random() - 0.5);

    for (const sentence of otherSentences) {
      if (distractors.length >= count) break;
      const fragment = sentence.split(',')[0].replace(/^(The|A|An)\s+/i, '').slice(0, 80).trim();
      if (fragment.length > 10 && fragment !== correctAnswer && !distractors.includes(fragment)) {
        distractors.push(fragment);
      }
    }
  }

  // Fallback: generic distractors
  const fallbacks = ['None of the above', 'All of the above', 'Cannot be determined', 'Not mentioned in the text'];
  while (distractors.length < count) {
    const fb = fallbacks[distractors.length % fallbacks.length];
    if (!distractors.includes(fb)) distractors.push(fb);
  }

  return distractors.slice(0, count);
}

// ─── Question Templates ───────────────────────────────────────────────────────

function generateDefinitionQuestion(
  term: string,
  definition: string,
  text: string,
  difficulty: Difficulty,
  chunk: TextChunk
): MCQQuestion | null {
  const distractors = generateDistractors(definition, text);
  if (distractors.length < 2) return null;

  const options = shuffleOptions([definition, ...distractors.slice(0, 3)]);
  const correct = options.find(o => o.text === definition);
  if (!correct) return null;

  const templates = [
    `What is the correct definition of "${term}"?`,
    `Which of the following best describes "${term}"?`,
    `"${term}" is best defined as which of the following?`,
  ];

  return {
    id: uuidv4(),
    question: templates[Math.floor(Math.random() * templates.length)],
    options,
    correctAnswer: correct.id,
    explanation: `"${term}" ${definition}.`,
    hint: `Look for the relationship between "${term}" and its core characteristics.`,
    chapter: chunk.chapter,
    topic: extractTopic(term),
    difficulty,
    pageRange: chunk.pageRange,
    chunkIndex: chunk.index,
    createdAt: Date.now(),
  };
}

function generateSentenceCompletionQuestion(
  sentence: string,
  text: string,
  difficulty: Difficulty,
  chunk: TextChunk
): MCQQuestion | null {
  const words = sentence.split(' ');
  if (words.length < 8) return null;

  // Pick a key word/phrase to blank out (not the first few words)
  const candidateStart = Math.floor(words.length * 0.35);
  const candidateEnd = Math.floor(words.length * 0.75);
  const blankLength = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
  const blankStart = candidateStart + Math.floor(Math.random() * (candidateEnd - candidateStart));
  const blankEnd = Math.min(blankStart + blankLength, words.length - 2);

  const blankedPhrase = words.slice(blankStart, blankEnd).join(' ');
  if (blankedPhrase.length < 3) return null;

  const blanked = [...words.slice(0, blankStart), '________', ...words.slice(blankEnd)].join(' ');

  const distractors = generateDistractors(blankedPhrase, text);
  if (distractors.length < 2) return null;

  const options = shuffleOptions([blankedPhrase, ...distractors.slice(0, 3)]);
  const correct = options.find(o => o.text === blankedPhrase);
  if (!correct) return null;

  return {
    id: uuidv4(),
    question: `Complete the following: "${blanked}"`,
    options,
    correctAnswer: correct.id,
    explanation: `The correct answer is "${blankedPhrase}". Original: "${sentence}"`,
    hint: `Think about the context and what word or phrase logically fits in the blank.`,
    chapter: chunk.chapter,
    topic: extractTopic(blankedPhrase),
    difficulty,
    pageRange: chunk.pageRange,
    chunkIndex: chunk.index,
    createdAt: Date.now(),
  };
}

function generateFactualQuestion(
  sentence: string,
  text: string,
  difficulty: Difficulty,
  chunk: TextChunk
): MCQQuestion | null {
  const keyPhrases = extractKeyPhrases(sentence);
  if (keyPhrases.length === 0) return null;

  const answer = keyPhrases[Math.floor(Math.random() * Math.min(keyPhrases.length, 3))];
  if (!answer || answer.length < 4) return null;

  const question = sentence.replace(answer, '________').replace(/^[a-z]/, c => c.toUpperCase());
  const distractors = generateDistractors(answer, text);
  if (distractors.length < 2) return null;

  const options = shuffleOptions([answer, ...distractors.slice(0, 3)]);
  const correct = options.find(o => o.text === answer);
  if (!correct) return null;

  const questionTemplates = [
    `According to the text, what fills the blank? "${question}"`,
    `Which of the following correctly completes: "${question}"`,
    `Based on the passage, identify the correct answer: "${question}"`,
  ];

  return {
    id: uuidv4(),
    question: questionTemplates[Math.floor(Math.random() * questionTemplates.length)],
    options,
    correctAnswer: correct.id,
    explanation: `The correct answer is "${answer}". This is directly stated in the text.`,
    hint: `The answer can be found by carefully reading the sentence structure and context.`,
    chapter: chunk.chapter,
    topic: extractTopic(answer),
    difficulty,
    pageRange: chunk.pageRange,
    chunkIndex: chunk.index,
    createdAt: Date.now(),
  };
}

function generateNumericalQuestion(
  context: string,
  value: string,
  text: string,
  difficulty: Difficulty,
  chunk: TextChunk
): MCQQuestion | null {
  const distractors = generateDistractors(value, text);
  const question = context.replace('___', '________');

  const options = shuffleOptions([value, ...distractors.slice(0, 3)]);
  const correct = options.find(o => o.text === value);
  if (!correct) return null;

  return {
    id: uuidv4(),
    question: `What is the correct value in this context? "${question}"`,
    options,
    correctAnswer: correct.id,
    explanation: `The correct value is ${value}. This figure appears in the text within the given context.`,
    hint: `Focus on the numerical data mentioned in the passage around this context.`,
    chapter: chunk.chapter,
    topic: 'Numerical Data',
    difficulty,
    pageRange: chunk.pageRange,
    chunkIndex: chunk.index,
    createdAt: Date.now(),
  };
}

function generateTrueFalseStyleQuestion(
  sentence: string,
  text: string,
  difficulty: Difficulty,
  chunk: TextChunk
): MCQQuestion | null {
  const phrases = extractKeyPhrases(text);
  if (phrases.length < 2) return null;

  const correctPhrase = phrases[Math.floor(Math.random() * Math.min(phrases.length, 5))];
  const incorrectPhrase = phrases.find(p => p !== correctPhrase) || 'None of the above';

  const statement = sentence.trim();
  if (statement.length < 30) return null;

  const options = shuffleOptions([
    'True – The statement is accurate as presented',
    'False – The statement contains an error',
    'Partially true – Only some aspects are correct',
    'Cannot be determined from the text',
  ]);
  const correct = options[0]; // We'll make "True" always correct for extracted real sentences

  return {
    id: uuidv4(),
    question: `Evaluate this statement from the text: "${statement.slice(0, 120)}${statement.length > 120 ? '...' : ''}"`,
    options,
    correctAnswer: correct.id,
    explanation: `This statement is directly supported by the text in the passage.`,
    hint: `Re-read the passage carefully and check whether this statement aligns with what is written.`,
    chapter: chunk.chapter,
    topic: extractTopic(correctPhrase),
    difficulty,
    pageRange: chunk.pageRange,
    chunkIndex: chunk.index,
    createdAt: Date.now(),
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function shuffleOptions(texts: string[]): Array<{ id: string; text: string }> {
  const options = texts.map(text => ({ id: uuidv4(), text }));
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}

function extractTopic(phrase: string): string {
  const words = phrase.split(' ');
  return words.slice(0, Math.min(3, words.length)).join(' ');
}

function pickDifficulty(config: GenerationConfig, index: number): Difficulty {
  const { easy, medium, hard } = config.difficultyDistribution;
  const rand = Math.random() * 100;
  if (rand < easy) return 'easy';
  if (rand < easy + medium) return 'medium';
  return 'hard';
}

// ─── Main Generator ───────────────────────────────────────────────────────────

export async function generateQuestionsFromChunk(
  chunk: TextChunk,
  config: GenerationConfig = DEFAULT_CONFIG
): Promise<MCQQuestion[]> {
  const questions: MCQQuestion[] = [];
  const text = chunk.text;
  const target = config.questionsPerChunk;

  const sentences = splitSentences(text);
  const defPairs = extractDefinitionPairs(text);
  const numbers = extractNumbers(text);

  let attempts = 0;
  const maxAttempts = target * 6;

  while (questions.length < target && attempts < maxAttempts) {
    attempts++;
    const difficulty = pickDifficulty(config, questions.length);
    const qType = Math.random();

    let q: MCQQuestion | null = null;

    if (qType < 0.25 && defPairs.length > 0) {
      // Definition question
      const pair = defPairs[Math.floor(Math.random() * defPairs.length)];
      q = generateDefinitionQuestion(pair.term, pair.definition, text, difficulty, chunk);
    } else if (qType < 0.55 && sentences.length > 0) {
      // Sentence completion
      const sentence = sentences[Math.floor(Math.random() * sentences.length)];
      q = generateSentenceCompletionQuestion(sentence, text, difficulty, chunk);
    } else if (qType < 0.75 && sentences.length > 0) {
      // Factual question
      const sentence = sentences[Math.floor(Math.random() * sentences.length)];
      q = generateFactualQuestion(sentence, text, difficulty, chunk);
    } else if (qType < 0.88 && numbers.length > 0) {
      // Numerical question
      const num = numbers[Math.floor(Math.random() * numbers.length)];
      q = generateNumericalQuestion(num.context, num.value, text, difficulty, chunk);
    } else if (sentences.length > 0) {
      // True/False style
      const sentence = sentences[Math.floor(Math.random() * sentences.length)];
      q = generateTrueFalseStyleQuestion(sentence, text, difficulty, chunk);
    }

    if (q && !isDuplicate(q, questions)) {
      questions.push(q);
    }
  }

  return questions;
}

function isDuplicate(q: MCQQuestion, existing: MCQQuestion[]): boolean {
  return existing.some(e => {
    const sim = similarity(e.question, q.question);
    return sim > 0.75;
  });
}

function similarity(a: string, b: string): number {
  const aWords = new Set(a.toLowerCase().split(/\W+/).filter(w => w.length > 3));
  const bWords = new Set(b.toLowerCase().split(/\W+/).filter(w => w.length > 3));
  const intersection = new Set([...aWords].filter(w => bWords.has(w)));
  const union = new Set([...aWords, ...bWords]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

export async function generateQuestionsFromChunks(
  chunks: TextChunk[],
  config: GenerationConfig,
  onProgress: (done: number, total: number, newQuestions: MCQQuestion[]) => void
): Promise<MCQQuestion[]> {
  const allQuestions: MCQQuestion[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunkQuestions = await generateQuestionsFromChunk(chunks[i], config);
    allQuestions.push(...chunkQuestions);
    onProgress(i + 1, chunks.length, chunkQuestions);

    // Yield to UI thread
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return allQuestions;
}
