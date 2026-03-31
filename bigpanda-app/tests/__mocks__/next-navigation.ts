// tests/__mocks__/next-navigation.ts
// Shared mock for next/navigation hooks used across component tests
import { vi } from 'vitest';

export const useSearchParams = vi.fn(() => new URLSearchParams('tab=overview'));
export const useRouter = vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }));
export const usePathname = vi.fn(() => '/customer/123');
export const redirect = vi.fn();
