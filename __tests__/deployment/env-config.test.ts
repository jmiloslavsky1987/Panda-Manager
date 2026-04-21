/**
 * Deployment Readiness Test: Environment Configuration
 *
 * Verifies that .env.example documents all required environment variables.
 * Fails if any required variable is missing or undocumented.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Environment Configuration', () => {
  const envExamplePath = join(__dirname, '../../.env.example');

  it('.env.example file exists', () => {
    expect(existsSync(envExamplePath)).toBe(true);
  });

  it('.env.example contains all required core variables', () => {
    const envContent = readFileSync(envExamplePath, 'utf-8');

    const requiredVars = [
      'DATABASE_URL',
      'REDIS_URL',
      'ANTHROPIC_API_KEY',
      'BETTER_AUTH_URL',
      'BETTER_AUTH_SECRET',
    ];

    requiredVars.forEach((varName) => {
      expect(
        envContent,
        `${varName} must be documented in .env.example`
      ).toMatch(new RegExp(`^${varName}=`, 'm'));
    });
  });

  it('.env.example contains all required SMTP variables', () => {
    const envContent = readFileSync(envExamplePath, 'utf-8');

    const smtpVars = [
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_USER',
      'SMTP_PASS',
      'SMTP_FROM',
    ];

    smtpVars.forEach((varName) => {
      expect(
        envContent,
        `${varName} must be documented in .env.example`
      ).toMatch(new RegExp(`^${varName}=`, 'm'));
    });
  });

  it('.env.example contains NODE_ENV', () => {
    const envContent = readFileSync(envExamplePath, 'utf-8');
    expect(envContent).toMatch(/^NODE_ENV=/m);
  });

  it('.env.example has descriptive comments for core variables', () => {
    const envContent = readFileSync(envExamplePath, 'utf-8');

    // Check that DATABASE_URL has a comment explaining the format
    const databaseSection = envContent.match(/# .*DATABASE_URL[\s\S]{0,300}DATABASE_URL=/);
    expect(
      databaseSection,
      'DATABASE_URL should have explanatory comment above it'
    ).toBeTruthy();

    // Check that BETTER_AUTH_SECRET mentions how to generate it
    const authSecretSection = envContent.match(/# .*BETTER_AUTH_SECRET[\s\S]{0,300}BETTER_AUTH_SECRET=/);
    expect(
      authSecretSection,
      'BETTER_AUTH_SECRET should have generation instructions'
    ).toBeTruthy();
  });
});
