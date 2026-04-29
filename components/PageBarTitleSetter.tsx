'use client';

/**
 * PageBarTitleSetter
 * Phase 81: KDS-05
 *
 * Thin client island that injects title and optional ctaSlot into
 * PageBarContext. Renders nothing visible — used by server-rendered
 * pages (app/page.tsx, etc.) to set the global PageBar title.
 *
 * Usage:
 *   <PageBarTitleSetter title="Portfolio" ctaSlot={<NewProjectButton />} />
 */

import { useEffect, type ReactNode } from 'react';
import { usePageBar } from './PageBarContext';

interface PageBarTitleSetterProps {
  title: string;
  ctaSlot?: ReactNode;
}

export function PageBarTitleSetter({ title, ctaSlot }: PageBarTitleSetterProps) {
  const { setTitle, setCtaSlot } = usePageBar();

  useEffect(() => {
    setTitle(title);
    setCtaSlot(ctaSlot ?? null);
    return () => {
      setTitle('');
      setCtaSlot(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  return null;
}
