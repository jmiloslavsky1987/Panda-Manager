// Setup file for @testing-library/jest-dom matchers (toBeInTheDocument, etc.)
// and @testing-library/react automatic DOM cleanup after each test.
// Loaded via vitest.config.ts setupFiles for component tests using jsdom environment.
import { expect, afterEach } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';

expect.extend(matchers);

// Clean up the rendered DOM after each test so renders don't bleed between tests.
// @testing-library/react's auto-cleanup only fires when globals (describe/it/afterEach)
// are defined — with globals: false we must wire it up manually.
afterEach(() => {
  cleanup();
});
