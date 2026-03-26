import mammoth from 'mammoth';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';

export type ExtractResult =
  | { kind: 'pdf'; base64: string }
  | { kind: 'text'; content: string };

export const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.pptx', '.xlsx', '.md', '.txt'];
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

async function extractPptxText(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);

  // Collect all slide files: ppt/slides/slide*.xml
  const slideEntries: Array<{ num: number; file: JSZip.JSZipObject }> = [];
  zip.forEach((relativePath, file) => {
    const match = relativePath.match(/^ppt\/slides\/slide(\d+)\.xml$/);
    if (match) {
      slideEntries.push({ num: parseInt(match[1], 10), file });
    }
  });

  // Sort by slide number (natural order)
  slideEntries.sort((a, b) => a.num - b.num);

  const slideTexts: string[] = [];
  for (const entry of slideEntries) {
    const xml = await entry.file.async('text');
    // Extract all <a:t> text node contents
    const matches = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)];
    const text = matches.map(m => m[1]).join(' ').trim();
    if (text.length > 0) {
      slideTexts.push(`Slide ${entry.num}:\n${text}`);
    }
  }

  return slideTexts.join('\n\n');
}

export function validateFile(filename: string, sizeBytes: number): string | null {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `Unsupported file type: ${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`;
  }
  if (sizeBytes > MAX_FILE_BYTES) {
    return `File exceeds 50 MB limit (${(sizeBytes / 1024 / 1024).toFixed(1)} MB)`;
  }
  return null;
}

export async function extractDocumentText(
  buffer: Buffer,
  filename: string
): Promise<ExtractResult> {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));

  if (ext === '.pdf') {
    return { kind: 'pdf', base64: buffer.toString('base64') };
  }
  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ buffer });
    return { kind: 'text', content: result.value };
  }
  if (ext === '.xlsx') {
    const wb = new ExcelJS.Workbook();
    // ExcelJS expects a legacy Buffer type; cast via ArrayBuffer to satisfy TS
    await wb.xlsx.load(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer);
    const lines: string[] = [];
    wb.worksheets.forEach(ws => {
      ws.eachRow(row => {
        const cells = (row.values as ExcelJS.CellValue[]).slice(1);
        lines.push(cells.map(v => (v == null ? '' : String(v))).join('\t'));
      });
    });
    return { kind: 'text', content: lines.join('\n') };
  }
  if (ext === '.pptx') {
    const content = await extractPptxText(buffer);
    return { kind: 'text', content };
  }
  // .md, .txt, and any other text-based format
  return { kind: 'text', content: buffer.toString('utf-8') };
}
