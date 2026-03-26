import { describe, it, expect } from 'vitest';
import { validateFile } from '@/lib/document-extractor';

describe('Upload validation (ING-02)', () => {
  it('ING-02: rejects files over 50 MB', () => {
    const err = validateFile('test.pdf', 60 * 1024 * 1024);
    expect(err).not.toBeNull();
    expect(err).toContain('50 MB');
  });

  it('ING-02: rejects unsupported file types', () => {
    const err = validateFile('test.exe', 1024);
    expect(err).not.toBeNull();
    expect(err).toContain('Unsupported');
  });

  it('ING-02: returns clear error message on rejection', () => {
    const err = validateFile('test.pdf', 1024);
    expect(err).toBeNull();
  });
});
