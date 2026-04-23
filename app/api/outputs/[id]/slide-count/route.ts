import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import JSZip from 'jszip';
import db from '../../../../../db';
import { outputs } from '../../../../../db/schema';
import { eq } from 'drizzle-orm';
import { requireSession } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { id } = await params;
  const outputId = parseInt(id, 10);

  const [output] = await db
    .select()
    .from(outputs)
    .where(eq(outputs.id, outputId));

  if (!output) {
    return NextResponse.json({ error: 'Output not found' }, { status: 404 });
  }

  if (!output.filepath || !output.filepath.endsWith('.pptx')) {
    return NextResponse.json({ error: 'Not a PPTX file' }, { status: 400 });
  }

  const buffer = await readFile(output.filepath);
  const zip = await JSZip.loadAsync(buffer);
  const slideCount = Object.keys(zip.files).filter(
    name => /^ppt\/slides\/slide\d+\.xml$/.test(name)
  ).length;

  return NextResponse.json({ slideCount });
}
