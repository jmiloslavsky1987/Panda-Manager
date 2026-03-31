import { NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { db } from '../../../../db';
import { artifacts } from '../../../../db/schema';
import { validateFile } from '../../../../lib/document-extractor';
import { readSettings } from '../../../../lib/settings';
import { requireSession } from "@/lib/auth-server";

export const dynamic = 'force-dynamic';

// ─── POST /api/ingestion/upload ───────────────────────────────────────────────
// Accepts multipart/form-data with:
//   - project_id: string (required)
//   - files: one or more Blob/File fields named 'files'
//
// For each file:
//   - Validates type and size before any disk write
//   - Writes to {workspace_path}/ingestion/{project_id}/{original_filename}
//   - Creates an Artifact record in DB with ingestion_status: 'pending'
//
// Returns 201 with { artifacts: [...] } on full success.
// Returns 400 with { errors: [...] } if any files fail validation.
// Valid files in a mixed batch are still processed and written.

export async function POST(request: NextRequest) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: 'Invalid multipart form data' }, { status: 400 });
  }

  const projectIdRaw = formData.get('project_id');
  if (!projectIdRaw || typeof projectIdRaw !== 'string') {
    return Response.json({ error: 'project_id is required' }, { status: 400 });
  }
  const projectId = parseInt(projectIdRaw, 10);
  if (isNaN(projectId)) {
    return Response.json({ error: 'project_id must be a valid integer' }, { status: 400 });
  }

  const fileFields = formData.getAll('files');
  if (!fileFields || fileFields.length === 0) {
    return Response.json({ error: 'At least one file is required (field name: files)' }, { status: 400 });
  }

  const settings = await readSettings();
  const validationErrors: Array<{ filename: string; error: string }> = [];
  const successfulArtifacts: Array<{ id: number; name: string; ingestion_status: string }> = [];

  for (const fileField of fileFields) {
    if (!(fileField instanceof Blob)) {
      validationErrors.push({ filename: '(unknown)', error: 'Field is not a file' });
      continue;
    }

    const filename = (fileField as File).name ?? 'upload';
    const sizeBytes = fileField.size;

    // Validate before any disk write
    const validationError = validateFile(filename, sizeBytes);
    if (validationError) {
      validationErrors.push({ filename, error: validationError });
      continue;
    }

    try {
      const arrayBuffer = await fileField.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Write file to disk
      const destDir = path.join(settings.workspace_path, 'ingestion', String(projectId));
      await fs.mkdir(destDir, { recursive: true });
      const destPath = path.join(destDir, filename);
      await fs.writeFile(destPath, buffer);

      // Generate a unique external_id for uploaded artifacts
      const externalId = `UPLOAD-${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      // Create Artifact record in DB
      const [artifact] = await db
        .insert(artifacts)
        .values({
          project_id: projectId,
          external_id: externalId,
          name: filename,
          source: 'upload',
          ingestion_status: 'pending',
          ingestion_log_json: {
            uploaded_at: new Date().toISOString(),
            filename,
            file_size_bytes: sizeBytes,
          },
        })
        .returning({ id: artifacts.id, name: artifacts.name, ingestion_status: artifacts.ingestion_status });

      successfulArtifacts.push({
        id: artifact.id,
        name: artifact.name,
        ingestion_status: artifact.ingestion_status ?? 'pending',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      validationErrors.push({ filename, error: `Upload failed: ${message}` });
    }
  }

  if (validationErrors.length > 0) {
    return Response.json(
      {
        errors: validationErrors,
        ...(successfulArtifacts.length > 0 && { artifacts: successfulArtifacts }),
      },
      { status: 400 }
    );
  }

  return Response.json({ artifacts: successfulArtifacts }, { status: 201 });
}
