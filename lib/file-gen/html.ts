import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';

export function generateHtml(html: string, outputPath: string): void {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, html, 'utf-8');
}
