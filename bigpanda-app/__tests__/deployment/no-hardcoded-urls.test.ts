/**
 * Deployment Readiness Test: No Hardcoded URLs
 *
 * Verifies that production code does not contain hardcoded localhost URLs
 * or other environment-specific values that would break in production.
 *
 * Allowed: Test files can use localhost (they don't run in production)
 * Not allowed: app/, worker/, lib/ with localhost fallbacks
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { join } from 'path';

describe('Hardcoded URLs', () => {
  const appRoot = join(__dirname, '../..');

  /**
   * Helper: Search for pattern in production code (excludes tests)
   */
  const searchProductionCode = (pattern: string): string => {
    try {
      const result = execSync(
        `grep -r "${pattern}" app/ worker/ lib/ --include="*.ts" --include="*.tsx" 2>/dev/null || true`,
        { cwd: appRoot, encoding: 'utf-8' }
      );

      // Filter out test files and comments
      const lines = result.split('\n').filter((line) => {
        return (
          line.trim() !== '' &&
          !line.includes('__tests__') &&
          !line.includes('.test.ts') &&
          !line.includes('.spec.ts') &&
          !line.match(/^\s*\/\//) &&  // Skip comments
          !line.match(/^\s*\*/)       // Skip JSDoc
        );
      });

      return lines.join('\n');
    } catch (error) {
      return '';
    }
  };

  it('production code does not contain "localhost" strings', () => {
    const results = searchProductionCode('localhost');

    expect(
      results,
      'Found hardcoded "localhost" in production code. All URLs must use environment variables.\n\n' +
        'Violations:\n' + results
    ).toBe('');
  });

  it('production code does not contain "127.0.0.1" strings', () => {
    const results = searchProductionCode('127.0.0.1');

    expect(
      results,
      'Found hardcoded "127.0.0.1" in production code. All URLs must use environment variables.\n\n' +
        'Violations:\n' + results
    ).toBe('');
  });

  it('production code does not contain "http://localhost" patterns', () => {
    const results = searchProductionCode('http://localhost');

    expect(
      results,
      'Found hardcoded "http://localhost" in production code.\n\n' +
        'Use process.env.BETTER_AUTH_URL or process.env.NEXT_PUBLIC_BASE_URL instead.\n\n' +
        'Violations:\n' + results
    ).toBe('');
  });

  it('production code does not contain "redis://localhost" patterns', () => {
    const results = searchProductionCode('redis://localhost');

    expect(
      results,
      'Found hardcoded "redis://localhost" in production code.\n\n' +
        'Use process.env.REDIS_URL! (fail fast if missing).\n\n' +
        'Violations:\n' + results
    ).toBe('');
  });

  it('production code does not use ?? fallback operators with localhost', () => {
    // This test detects patterns like: process.env.VAR ?? 'localhost'
    const results = searchProductionCode('??.*localhost');

    expect(
      results,
      'Found nullish coalescing (??) operator with localhost fallback.\n\n' +
        'Production code must fail fast if env vars missing (use ! assertion).\n\n' +
        'Violations:\n' + results
    ).toBe('');
  });
});
