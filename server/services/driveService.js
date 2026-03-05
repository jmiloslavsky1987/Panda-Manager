// server/services/driveService.js
// Google Drive API v3 service account integration
// SCOPE: auth/drive (full, not drive.file — drive.file only covers service-account-owned files)
// AUTH: Pass auth object to drive client; never cache raw tokens (they expire after 3600s)
require('dotenv').config();
const { google } = require('googleapis');
const { Readable } = require('stream');

const SCOPES = ['https://www.googleapis.com/auth/drive'];

const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_PATH,
  scopes: SCOPES,
});

const drive = google.drive({ version: 'v3', auth });

async function listCustomerFiles() {
  const folderId = process.env.DRIVE_FOLDER_ID;
  const res = await drive.files.list({
    q: `'${folderId}' in parents and name contains '_Master_Status.yaml' and trashed=false`,
    fields: 'files(id, name, modifiedTime)',
    orderBy: 'name',
  });
  return res.data.files || [];
}

async function readYamlFile(fileId) {
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );
  return new Promise((resolve, reject) => {
    const chunks = [];
    res.data.on('data', (chunk) => chunks.push(chunk));
    res.data.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    res.data.on('error', reject);
  });
}

async function writeYamlFile(fileId, yamlContent) {
  await drive.files.update({
    fileId,
    media: {
      mimeType: 'text/plain',
      body: Readable.from([yamlContent]),
    },
  });
}

async function createYamlFile(fileName, yamlContent) {
  const folderId = process.env.DRIVE_FOLDER_ID;
  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
      mimeType: 'text/plain',
    },
    media: {
      mimeType: 'text/plain',
      body: Readable.from([yamlContent]),
    },
    fields: 'id, name',
  });
  return res.data; // { id, name }
}

async function checkDriveHealth() {
  const files = await listCustomerFiles();
  return { ok: true, fileCount: files.length, files: files.map(f => f.name) };
}

module.exports = { listCustomerFiles, readYamlFile, writeYamlFile, createYamlFile, checkDriveHealth };
