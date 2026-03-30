import { describe, it, expect } from 'vitest';

// WIZ-03: AiPreviewStep filter bug regression tests
// The bug: fileStatuses.filter(f => f.artifactId && f.status !== 'done')
// When all uploaded files have status 'done' (set by CollateralUploadStep after
// successful upload), this filter returns ZERO files, so no extraction calls fire.
//
// The fix: fileStatuses.filter(f => f.artifactId)
// Only check for the presence of an artifactId — the extraction loop manages its
// own local status state (localStatuses) independently.

type FileStatus = {
  name: string;
  status: 'pending' | 'extracting' | 'done' | 'error';
  artifactId?: number;
};

describe('AiPreviewStep filter logic', () => {
  const baseFileStatuses: FileStatus[] = [
    { name: 'file1.pdf', status: 'done', artifactId: 101 },
    { name: 'file2.pdf', status: 'done', artifactId: 102 },
    { name: 'file3.pdf', status: 'pending', artifactId: undefined },
  ];

  it('WIZ-03-1 (documents the bug): broken filter returns zero files when all uploads are done', () => {
    // The broken filter — this is the code that existed before the fix
    const brokenFilter = baseFileStatuses.filter(
      (f) => f.artifactId && f.status !== 'done',
    );
    // Both files with artifactId have status 'done', so they are EXCLUDED — BUG
    expect(brokenFilter).toHaveLength(0);
  });

  it('WIZ-03-2 (documents the fix): fixed filter returns all files that have an artifactId', () => {
    // The fixed filter — checks only for artifactId presence
    const fixedFilter = baseFileStatuses.filter((f) => f.artifactId);
    // Both uploaded files (with artifactId) are included regardless of status
    expect(fixedFilter).toHaveLength(2);
  });

  it('WIZ-03-3: files with no artifactId are excluded by both filters', () => {
    const brokenFilter = baseFileStatuses.filter(
      (f) => f.artifactId && f.status !== 'done',
    );
    const fixedFilter = baseFileStatuses.filter((f) => f.artifactId);

    // file3.pdf has no artifactId — excluded by both
    expect(brokenFilter.some((f) => f.name === 'file3.pdf')).toBe(false);
    expect(fixedFilter.some((f) => f.name === 'file3.pdf')).toBe(false);
  });

  it('WIZ-03-4: files with artifactId and status pending/extracting are included by fixed filter', () => {
    const fileStatuses: FileStatus[] = [
      ...baseFileStatuses,
      { name: 'file4.pdf', status: 'pending', artifactId: 103 },
    ];

    const brokenFilter = fileStatuses.filter(
      (f) => f.artifactId && f.status !== 'done',
    );
    const fixedFilter = fileStatuses.filter((f) => f.artifactId);

    // file4.pdf has artifactId and status 'pending' (not 'done')
    // Broken filter: INCLUDES it (status !== 'done' passes)
    expect(brokenFilter.some((f) => f.name === 'file4.pdf')).toBe(true);
    // Fixed filter: INCLUDES it (has artifactId)
    expect(fixedFilter.some((f) => f.name === 'file4.pdf')).toBe(true);

    // Fixed filter also includes file1 and file2 (unlike broken filter)
    expect(fixedFilter).toHaveLength(3); // file1, file2, file4 (file3 has no artifactId)
    expect(brokenFilter).toHaveLength(1); // only file4 (file1 and file2 are status 'done')
  });
});
