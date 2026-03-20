import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import db from '../../../../../db';
import { outputs } from '../../../../../db/schema';
import { eq } from 'drizzle-orm';

const execAsync = promisify(exec);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [output] = await db.select().from(outputs).where(eq(outputs.id, parseInt(id)));
  if (!output?.filepath) {
    return NextResponse.json({ error: 'No filepath for this output' }, { status: 400 });
  }
  try {
    await execAsync(`open "${output.filepath}"`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
