'use client';
import { useEffect, useRef } from 'react';

interface DocxPreviewProps {
  url: string;
}

export default function DocxPreview({ url }: DocxPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      // Dynamic import inside useEffect — NOT at module level.
      // This prevents SSR ReferenceError since docx-preview accesses browser APIs.
      const { renderAsync } = await import('docx-preview');
      const res = await fetch(url);
      const blob = await res.blob();
      if (!cancelled && containerRef.current) {
        containerRef.current.innerHTML = '';
        await renderAsync(blob, containerRef.current, undefined, { inWrapper: false });
      }
    }

    render().catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [url]);

  return <div ref={containerRef} className="w-full h-full overflow-y-auto" />;
}
