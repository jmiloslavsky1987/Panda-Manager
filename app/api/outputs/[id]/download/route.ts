import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import db from '../../../../../db';
import { outputs } from '../../../../../db/schema';
import { eq } from 'drizzle-orm';
import { requireSession } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

const MIME: Record<string, string> = {
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pdf':  'application/pdf',
  '.html': 'text/html',
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { id } = await params;
  const [output] = await db.select().from(outputs).where(eq(outputs.id, parseInt(id)));
  if (!output?.filepath) {
    return NextResponse.json({ error: 'No filepath for this output' }, { status: 400 });
  }

  let buffer: Buffer;
  try {
    buffer = await readFile(output.filepath);
  } catch {
    return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
  }

  const ext = path.extname(output.filepath).toLowerCase();
  const contentType = MIME[ext] ?? 'application/octet-stream';
  const filename = output.filename ?? path.basename(output.filepath);

  return new Response(buffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.byteLength),
    },
  });
}
