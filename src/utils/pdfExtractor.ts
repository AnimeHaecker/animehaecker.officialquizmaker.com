import * as pdfjsLib from 'pdfjs-dist';

// Use CDN worker for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface ExtractionResult {
  pages: ExtractedPage[];
  totalPages: number;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
  };
}

export async function extractTextFromPDF(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<ExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  const loadingTask = pdfjsLib.getDocument({
    data: uint8Array,
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist/standard_fonts/',
  });

  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;

  // Extract metadata
  let metadata: ExtractionResult['metadata'] = {};
  try {
    const meta = await pdf.getMetadata();
    const info = meta.info as Record<string, string>;
    metadata = {
      title: info?.Title || '',
      author: info?.Author || '',
      subject: info?.Subject || '',
    };
  } catch {
    // ignore metadata errors
  }

  const pages: ExtractedPage[] = [];

  // Process pages in batches of 10 to avoid memory issues with large PDFs
  const BATCH_SIZE = 10;
  for (let batchStart = 1; batchStart <= totalPages; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, totalPages);
    const batchPromises: Promise<ExtractedPage>[] = [];

    for (let pageNum = batchStart; pageNum <= batchEnd; pageNum++) {
      batchPromises.push(extractPage(pdf, pageNum));
    }

    const batchResults = await Promise.all(batchPromises);
    pages.push(...batchResults);

    if (onProgress) {
      onProgress(batchEnd, totalPages);
    }

    // Small delay to prevent UI blocking on very large files
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return { pages, totalPages, metadata };
}

async function extractPage(pdf: pdfjsLib.PDFDocumentProxy, pageNum: number): Promise<ExtractedPage> {
  const page = await pdf.getPage(pageNum);
  const textContent = await page.getTextContent();

  const text = textContent.items
    .map((item: any) => {
      if ('str' in item) {
        return item.str;
      }
      return '';
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { pageNumber: pageNum, text };
}

export function detectChapters(pages: ExtractedPage[]): Map<number, string> {
  const chapterMap = new Map<number, string>();
  const chapterPatterns = [
    /^chapter\s+(\d+|[ivxlcdm]+)[:\s–\-]?\s*(.{0,60})/i,
    /^(part|section|unit)\s+(\d+|[ivxlcdm]+)[:\s–\-]?\s*(.{0,60})/i,
    /^(\d+)\.\s+[A-Z].{2,60}/,
    /^[A-Z][A-Z\s]{4,40}$/,
  ];

  pages.forEach(page => {
    const firstLines = page.text.split(/[.!?]\s+/).slice(0, 3).join(' ').trim();
    for (const pattern of chapterPatterns) {
      const match = firstLines.match(pattern);
      if (match) {
        chapterMap.set(page.pageNumber, match[0].slice(0, 60).trim());
        break;
      }
    }
  });

  return chapterMap;
}
