#!/usr/bin/env node
// scripts/migrateYaml.js
// One-shot migration: patches all 3 customer YAML files in Drive to match the app schema.
// Run from project root: node scripts/migrateYaml.js
// Safe: never deletes existing data, only adds missing keys with empty defaults.
'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const yaml   = require('js-yaml');
const { google } = require('googleapis');
const fs     = require('fs');
const path   = require('path');

// ── Drive auth (same pattern as server/services/driveService.js) ────────────
// GOOGLE_SERVICE_ACCOUNT_PATH is relative to server/ dir (matches how the server uses it)
const credPath = path.resolve(__dirname, '../server', process.env.GOOGLE_SERVICE_ACCOUNT_PATH);
const creds    = JSON.parse(fs.readFileSync(credPath, 'utf8'));
const auth     = new google.auth.GoogleAuth({
  credentials: creds,
  scopes: ['https://www.googleapis.com/auth/drive'],
});
const drive = google.drive({ version: 'v3', auth });

// ── YAML helpers ─────────────────────────────────────────────────────────────
function parseYaml(content) {
  return yaml.load(content, { schema: yaml.JSON_SCHEMA });
}
function serializeYaml(data) {
  return yaml.dump(data, { sortKeys: false, lineWidth: -1, noRefs: true });
}

// ── Drive read/write (same as driveService.js) ───────────────────────────────
async function readYamlFile(fileId) {
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'text' }
  );
  return res.data;
}

async function writeYamlFile(fileId, content) {
  const { Readable } = require('stream');
  const body = Readable.from([content]);
  await drive.files.update({
    fileId,
    media: { mimeType: 'application/x-yaml', body },
  });
}

// ── Migration logic ───────────────────────────────────────────────────────────
//
// Rules (zero data loss):
// 1. If `customer` is a string, convert to { name: <string> }
// 2. If `project` is a string, convert to { name: <string> }
// 3. If `status` is missing, add status: "not_started"
// 4. If `workstreams` is missing, add workstreams: {}
// 5. If `actions` is missing, add actions: []
// 6. If `risks` is missing, add risks: []
// 7. If `milestones` is missing, add milestones: []
// 8. If `artifacts` is missing, add artifacts: []
// 9. If `history` is missing, add history: []
// All other keys (including AMEX's 24 top-level keys) are preserved as-is.

function migrateData(data, fileId) {
  const patched = { ...data };

  // 1. customer: string → object
  if (typeof patched.customer === 'string') {
    console.log(`  [${fileId}] customer: string → { name: "${patched.customer}" }`);
    patched.customer = { name: patched.customer };
  }
  if (typeof patched.customer !== 'object' || patched.customer === null) {
    patched.customer = { name: String(patched.customer ?? '') };
  }

  // 2. project: string → object
  if (typeof patched.project === 'string') {
    console.log(`  [${fileId}] project: string → { name: "${patched.project}" }`);
    patched.project = { name: patched.project };
  }
  // If project is already an object (AMEX), leave it alone

  // 3–9. Missing array/object fields — add with empty defaults
  if (!('status' in patched)) {
    console.log(`  [${fileId}] status: (missing) → "not_started"`);
    patched.status = 'not_started';
  }
  if (!('workstreams' in patched)) {
    console.log(`  [${fileId}] workstreams: (missing) → {}`);
    patched.workstreams = {};
  }
  if (!('actions' in patched)) {
    console.log(`  [${fileId}] actions: (missing) → []`);
    patched.actions = [];
  }
  if (!('risks' in patched)) {
    console.log(`  [${fileId}] risks: (missing) → []`);
    patched.risks = [];
  }
  if (!('milestones' in patched)) {
    console.log(`  [${fileId}] milestones: (missing) → []`);
    patched.milestones = [];
  }
  if (!('artifacts' in patched)) {
    console.log(`  [${fileId}] artifacts: (missing) → []`);
    patched.artifacts = [];
  }
  if (!('history' in patched)) {
    console.log(`  [${fileId}] history: (missing) → []`);
    patched.history = [];
  }

  return patched;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const FOLDER_ID = process.env.DRIVE_FOLDER_ID;
  if (!FOLDER_ID) throw new Error('DRIVE_FOLDER_ID not set in .env');

  // List all YAML files in the folder
  const listRes = await drive.files.list({
    q: `'${FOLDER_ID}' in parents and trashed = false`,
    fields: 'files(id, name)',
  });
  const files = listRes.data.files ?? [];
  if (files.length === 0) {
    console.log('No files found in Drive folder.');
    return;
  }

  console.log(`Found ${files.length} file(s) in Drive folder.\n`);

  let allOk = true;
  for (const file of files) {
    console.log(`── Processing: ${file.name} (${file.id})`);
    try {
      const raw     = await readYamlFile(file.id);
      const data    = parseYaml(raw);
      const patched = migrateData(data, file.id);
      const output  = serializeYaml(patched);

      // Verify the patched data parses back cleanly
      parseYaml(output); // throws if corrupted

      await writeYamlFile(file.id, output);
      console.log(`  ✓ Written back successfully.\n`);
    } catch (err) {
      console.error(`  ✗ ERROR for ${file.name}: ${err.message}\n`);
      allOk = false;
    }
  }

  if (allOk) {
    console.log('Migration complete — all files updated with zero data loss.');
  } else {
    console.error('Migration finished with errors — review output above.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
