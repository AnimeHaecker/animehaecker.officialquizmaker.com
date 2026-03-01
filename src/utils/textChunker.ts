import { TextChunk } from '../types';
import { ExtractedPage, detectChapters } from './pdfExtractor';

const CHUNK_SIZE_WORDS = 400;
const CHUNK_OVERLAP_WORDS = 50;
const MIN_CHUNK_WORDS = 80;

export function chunkPages(pages: ExtractedPage[], questionsPerChunk: number = 5): TextChunk[] {
  const chapterMap = detectChapters(pages);
  const chunks: TextChunk[] = [];

  // Group pages into semantic chunks
  let currentChunkText = '';
  let currentChunkPages: number[] = [];
  let currentChapter = 'Chapter 1';
  let chunkIndex = 0;

  for (const page of pages) {
    // Detect chapter transition
    if (chapterMap.has(page.pageNumber)) {
      currentChapter = chapterMap.get(page.pageNumber)!;
    }

    const pageWords = page.text.split(/\s+/).filter(Boolean);

    // If adding this page exceeds chunk size, flush current chunk
    const currentWords = currentChunkText.split(/\s+/).filter(Boolean).length;

    if (currentWords + pageWords.length > CHUNK_SIZE_WORDS && currentWords >= MIN_CHUNK_WORDS) {
      // Flush
      if (currentChunkText.trim().length > 50) {
        chunks.push(createChunk(chunkIndex++, currentChunkText, currentChunkPages, currentChapter));
      }

      // Keep overlap: last CHUNK_OVERLAP_WORDS words from previous chunk
      const overlapWords = currentChunkText.split(/\s+/).filter(Boolean).slice(-CHUNK_OVERLAP_WORDS);
      currentChunkText = overlapWords.join(' ') + ' ' + page.text;
      currentChunkPages = [page.pageNumber];
    } else {
      currentChunkText += ' ' + page.text;
      currentChunkPages.push(page.pageNumber);
    }
  }

  // Flush last chunk
  if (currentChunkText.trim().length > 50) {
    chunks.push(createChunk(chunkIndex++, currentChunkText, currentChunkPages, currentChapter));
  }

  return chunks.filter(c => c.wordCount >= MIN_CHUNK_WORDS);
}

function createChunk(
  index: number,
  text: string,
  pages: number[],
  chapter: string
): TextChunk {
  const cleanText = text.replace(/\s+/g, ' ').trim();
  const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
  const pageRange =
    pages.length > 0
      ? pages.length === 1
        ? `Page ${pages[0]}`
        : `Pages ${pages[0]}–${pages[pages.length - 1]}`
      : 'Unknown';

  return {
    index,
    text: cleanText,
    pageRange,
    chapter,
    wordCount,
  };
}

export function estimateQuestionCount(chunks: TextChunk[], questionsPerChunk: number = 5): number {
  return chunks.length * questionsPerChunk;
}
