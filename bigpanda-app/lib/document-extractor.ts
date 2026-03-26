import mammoth from 'mammoth';
import ExcelJS from 'exceljs';

export type ExtractResult =
  | { kind: 'pdf'; base64: string }
  | { kind: 'text'; content: string };

export const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.pptx', '.xlsx', '.md', '.txt'];
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

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
    await wb.xlsx.load(buffer as unknown as Buffer);
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
    return {
      kind: 'text',
      content: `[PPTX: ${filename} — text extraction limited; Claude will extract from bullet text if present]`,
    };
  }
  // .md, .txt, and any other text-based format
  return { kind: 'text', content: buffer.toString('utf-8') };
}
