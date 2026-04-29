'use client';

/**
 * Kata Design System — PageBarContext
 * Phase 81: KDS-04
 *
 * Provides React Context for injecting title and CTA slot into the PageBar.
 * Pages call setTitle() and setCtaSlot() to populate the top bar.
 */

import { createContext, useContext, useState, type ReactNode } from 'react';

interface PageBarContextValue {
  title: string;
  ctaSlot: ReactNode;
  setTitle: (title: string) => void;
  setCtaSlot: (slot: ReactNode) => void;
}

export const PageBarContext = createContext<PageBarContextValue>({
  title: '',
  ctaSlot: null,
  setTitle: () => {},
  setCtaSlot: () => {},
});

export function PageBarProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<string>('');
  const [ctaSlot, setCtaSlot] = useState<ReactNode>(null);

  return (
    <PageBarContext.Provider value={{ title, ctaSlot, setTitle, setCtaSlot }}>
      {children}
    </PageBarContext.Provider>
  );
}

export function usePageBar() {
  return useContext(PageBarContext);
}
