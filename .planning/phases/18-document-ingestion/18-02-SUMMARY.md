---
phase: 18-document-ingestion
plan: 02
subsystem: ingestion
tags: [vitest, drizzle, nextjs, tdd, ingestion, mammoth, exceljs, upload]

# Dependency graph
requires:
  - phase: 18-01
    provides: RED stub test files (validation.test.ts, upload.test.ts) and schema with ingestion_status enum

provides:
  - bigpanda-app/lib/document-extractor.ts — validateFile() + extractDocumentText() for all supported formats
  - bigpanda-app/app/api/ingestion/upload/route.ts — POST handler for multipart file upload with DB record creation

affects:
  - 18-03 (extract route depends on document-extractor.ts's extractDocumentText)
  - 18-04 through 18-06 (all downstream routes use artifacts records created here)

# Tech tracking
tech-stack:
  added:
    - mammoth (DOCX raw text extraction)
  patterns:
    - "TDD RED→GREEN: update stub test files to real assertions, confirm RED (module not found), implement, confirm GREEN"
    - "Upload route pattern: formData.getAll('files') for multi-file upload"
    - "external_id for uploaded artifacts: UPLOAD-{timestamp}-{sanitized_filename}"
    - "ExcelJS XLSX Buffer cast: buffer.buffer.slice(offset, offset+length) as ArrayBuffer to satisfy TS strict types"
    - "vitest run with explicit --config bigpanda-app/vitest.config.ts required when running from project root"

key-files:
  created:
    - bigpanda-app/lib/document-extractor.ts
    - bigpanda-app/app/api/ingestion/upload/route.ts
  modified:
    - bigpanda-app/tests/ingestion/validation.test.ts
    - bigpanda-app/tests/ingestion/upload.test.ts

key-decisions:
  - "external_id for uploads: generated as UPLOAD-{timestamp}-{filename} — artifacts.external_id is NOT NULL so uploads need a synthetic value; timestamp ensures uniqueness within a project"
  - "ExcelJS Buffer type: Node 24 Buffer<ArrayBufferLike> diverges from ExcelJS's legacy Buffer expectation — cast via .buffer.slice() to ArrayBuffer instead of unknown cast"
  - "Mixed batch upload behavior: invalid files return 400 + errors array; valid files in the same request are still written and returned in artifacts array alongside the errors"

# Metrics
duration: 3min
completed: 2026-03-26
---

# Phase 18 Plan 02: Upload API Route + Document Extractor Summary

**Upload route (POST /api/ingestion/upload) + document extractor library — multi-format file ingestion entry point with size/type validation, disk write, and artifact DB record creation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-26T06:27:45Z
- **Completed:** 2026-03-26T06:30:55Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created `bigpanda-app/lib/document-extractor.ts` with `validateFile()` (type + size checks) and `extractDocumentText()` (PDF base64, DOCX via mammoth, XLSX via ExcelJS, PPTX stub text, TXT/MD utf-8)
- Created `bigpanda-app/app/api/ingestion/upload/route.ts` — multipart POST handler that validates, writes to disk, inserts Artifact DB record with `ingestion_status: 'pending'`
- Updated `validation.test.ts` and `upload.test.ts` from Wave 0 stubs to real assertions — 6/6 tests GREEN
- Installed `mammoth` package for DOCX extraction

## Task Commits

Each task was committed atomically:

1. **Task 1: document-extractor.ts — format detection and text extraction** - `8a3e9ab` (feat)
2. **Task 2: upload route + test real assertions** - `dfd41ae` (feat)

**Plan metadata:** (docs commit — see final commit)

## Files Created/Modified

- `bigpanda-app/lib/document-extractor.ts` — validateFile() and extractDocumentText() for PDF/DOCX/XLSX/PPTX/TXT/MD
- `bigpanda-app/app/api/ingestion/upload/route.ts` — POST /api/ingestion/upload multipart handler
- `bigpanda-app/tests/ingestion/validation.test.ts` — upgraded from stubs to real assertions (3 tests GREEN)
- `bigpanda-app/tests/ingestion/upload.test.ts` — upgraded from stubs to real assertions (3 tests GREEN)

## Decisions Made

- **external_id for uploads:** `artifacts.external_id` is NOT NULL in the schema. Uploaded files have no pre-assigned external ID, so the route generates `UPLOAD-{timestamp}-{sanitized_filename}`. This is unique per upload and traceable back to the original filename.
- **ExcelJS Buffer type:** Node 24 exposes `Buffer<ArrayBufferLike>` which doesn't satisfy ExcelJS's legacy `Buffer` type. Fixed by casting via `buffer.buffer.slice(byteOffset, byteOffset+byteLength) as ArrayBuffer` which ExcelJS accepts.
- **Mixed batch behavior:** If a batch of files contains both valid and invalid files, valid ones are still processed (written to disk + DB record). The response is always 400 when any file fails, but includes both `errors` and `artifacts` arrays.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed external_id NOT NULL constraint**
- **Found during:** Task 2 TypeScript check
- **Issue:** `artifacts.external_id` is `.notNull()` in schema.ts. The plan's interface comment showed it as optional but the actual schema requires it.
- **Fix:** Generate synthetic `UPLOAD-{timestamp}-{sanitized_filename}` as external_id in the upload route
- **Files modified:** `bigpanda-app/app/api/ingestion/upload/route.ts`
- **Commit:** dfd41ae

**2. [Rule 1 - Bug] Fixed ExcelJS Buffer type incompatibility**
- **Found during:** Task 1 TypeScript check
- **Issue:** `Buffer<ArrayBufferLike>` (Node 24) doesn't satisfy ExcelJS's expected `Buffer` type — `unknown` cast from plan was rejected by TS strict mode
- **Fix:** Cast via `buffer.buffer.slice(offset, offset+length) as ArrayBuffer` — accepted by ExcelJS xlsx.load()
- **Files modified:** `bigpanda-app/lib/document-extractor.ts`
- **Commit:** 8a3e9ab (amended in dfd41ae)

## Issues Encountered

- Pre-existing TypeScript error in `lib/yaml-export.ts` (missing `js-yaml` types) and pre-existing errors in `app/api/jobs/trigger/route.ts`, worker files — all out of scope; not introduced by this plan.

## Self-Check: PASSED

- FOUND: bigpanda-app/lib/document-extractor.ts
- FOUND: bigpanda-app/app/api/ingestion/upload/route.ts
- FOUND: bigpanda-app/tests/ingestion/validation.test.ts
- FOUND: bigpanda-app/tests/ingestion/upload.test.ts
- FOUND commit 8a3e9ab: feat(18-02): implement document-extractor.ts
- FOUND commit dfd41ae: feat(18-02): implement upload route + update tests

---
*Phase: 18-document-ingestion*
*Completed: 2026-03-26*
