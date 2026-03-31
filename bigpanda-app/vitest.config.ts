import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    setupFiles: ['./tests/setup-jest-dom.ts'],
    alias: {
      // 'server-only' is a Next.js build guard that has no runtime content.
      // In vitest (node env) it must be stubbed so tests can import server modules.
      'server-only': path.resolve(__dirname, 'tests/__mocks__/server-only.ts'),
      // '@xyflow/react' uses DOM APIs (ResizeObserver, getBoundingClientRect).
      // Mock prevents import errors in node test environment.
      '@xyflow/react': path.resolve(__dirname, 'tests/__mocks__/react-flow.ts'),
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
