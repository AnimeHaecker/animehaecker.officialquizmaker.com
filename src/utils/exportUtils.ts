import { MCQQuestion } from '../types';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportToCSV(questions: MCQQuestion[], filename = 'quiz_questions.csv') {
  const data = questions.map((q, i) => ({
    '#': i + 1,
    Question: q.question,
    'Option A': q.options[0]?.text || '',
    'Option B': q.options[1]?.text || '',
    'Option C': q.options[2]?.text || '',
    'Option D': q.options[3]?.text || '',
    'Correct Answer': q.options.find(o => o.id === q.correctAnswer)?.text || '',
    Explanation: q.explanation,
    Hint: q.hint,
    Chapter: q.chapter,
    Topic: q.topic,
    Difficulty: q.difficulty,
    'Page Range': q.pageRange,
  }));

  const csv = Papa.unparse(data);
  downloadFile(csv, filename, 'text/csv');
}

export function exportToExcel(questions: MCQQuestion[], filename = 'quiz_questions.xlsx') {
  const data = questions.map((q, i) => ({
    '#': i + 1,
    Question: q.question,
    'Option A': q.options[0]?.text || '',
    'Option B': q.options[1]?.text || '',
    'Option C': q.options[2]?.text || '',
    'Option D': q.options[3]?.text || '',
    'Correct Answer': q.options.find(o => o.id === q.correctAnswer)?.text || '',
    'Correct Letter': ['A', 'B', 'C', 'D'][q.options.findIndex(o => o.id === q.correctAnswer)] || '',
    Explanation: q.explanation,
    Hint: q.hint,
    Chapter: q.chapter,
    Topic: q.topic,
    Difficulty: q.difficulty,
    'Page Range': q.pageRange,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Column widths
  ws['!cols'] = [
    { wch: 5 }, { wch: 60 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 30 },
    { wch: 30 }, { wch: 8 }, { wch: 60 }, { wch: 40 }, { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 15 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Questions');

  // Stats sheet
  const diffCounts = { easy: 0, medium: 0, hard: 0 };
  const chapterCounts: Record<string, number> = {};
  questions.forEach(q => {
    diffCounts[q.difficulty]++;
    chapterCounts[q.chapter] = (chapterCounts[q.chapter] || 0) + 1;
  });

  const statsData = [
    { Metric: 'Total Questions', Value: questions.length },
    { Metric: 'Easy', Value: diffCounts.easy },
    { Metric: 'Medium', Value: diffCounts.medium },
    { Metric: 'Hard', Value: diffCounts.hard },
    ...Object.entries(chapterCounts).map(([ch, count]) => ({ Metric: ch, Value: count })),
  ];

  const wsStats = XLSX.utils.json_to_sheet(statsData);
  XLSX.utils.book_append_sheet(wb, wsStats, 'Statistics');

  XLSX.writeFile(wb, filename);
}

export function exportToPDF(questions: MCQQuestion[], title = 'Quiz Questions', filename = 'quiz_questions.pdf') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Cover page
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 297, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.text('QuizForge', 105, 80, { align: 'center' });
  doc.setFontSize(18);
  doc.text(title, 105, 100, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`${questions.length} Questions Generated`, 105, 120, { align: 'center' });
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 130, { align: 'center' });
  doc.addPage();

  // Questions
  const tableBody = questions.map((q, i) => {
    const correctLetter = ['A', 'B', 'C', 'D'][q.options.findIndex(o => o.id === q.correctAnswer)];
    return [
      String(i + 1),
      q.question,
      `A) ${q.options[0]?.text || ''}\nB) ${q.options[1]?.text || ''}\nC) ${q.options[2]?.text || ''}\nD) ${q.options[3]?.text || ''}`,
      correctLetter,
      q.difficulty,
      q.chapter.slice(0, 25),
    ];
  });

  autoTable(doc, {
    head: [['#', 'Question', 'Options', 'Ans', 'Diff', 'Chapter']],
    body: tableBody,
    startY: 20,
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 60 },
      2: { cellWidth: 80 },
      3: { cellWidth: 10 },
      4: { cellWidth: 15 },
      5: { cellWidth: 27 },
    },
    headStyles: { fillColor: [99, 102, 241] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 10, right: 10 },
  });

  // Answer Key page
  doc.addPage();
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('Answer Key & Explanations', 14, 20);

  let yPos = 30;
  for (let i = 0; i < Math.min(questions.length, 200); i++) {
    const q = questions[i];
    const correctLetter = ['A', 'B', 'C', 'D'][q.options.findIndex(o => o.id === q.correctAnswer)];
    const correctText = q.options.find(o => o.id === q.correctAnswer)?.text || '';

    if (yPos > 260) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Q${i + 1}: ${correctLetter}) ${correctText.slice(0, 80)}`, 14, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    const expLines = doc.splitTextToSize(q.explanation, 180);
    doc.text(expLines.slice(0, 2), 14, yPos);
    yPos += expLines.slice(0, 2).length * 4 + 3;
  }

  doc.save(filename);
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
