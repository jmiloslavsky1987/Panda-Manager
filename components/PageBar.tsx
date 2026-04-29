'use client';

/**
 * Kata Design System — PageBar
 * Phase 81: KDS-04
 *
 * 44px top bar rendered inside every page (except /login, /setup, /customer/ routes).
 * Left: breadcrumb/title from PageBarContext.
 * Right: ctaSlot from PageBarContext + theme toggle icon.
 *
 * Theme toggle: toggles document.documentElement.classList('dark') and
 * persists selection to localStorage via 'kata-theme' key.
 *
 * Suppression: reads usePathname(). Returns null on /login, /setup, /customer/ routes.
 */

import { usePathname } from 'next/navigation';
import { usePageBar } from './PageBarContext';
import { Icon } from './Icon';
import { useState, useEffect } from 'react';

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('kata-theme', isDark ? 'dark' : 'light');
}

const SUPPRESSED_PATHS = ['/login', '/setup', '/customer/'];

export function PageBar() {
  const pathname = usePathname();
  const { title, ctaSlot } = usePageBar();

  // Track dark state for the correct icon
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    // Initialize from current html class
    setIsDark(document.documentElement.classList.contains('dark'));

    // Listen for external theme changes (e.g. ThemeProvider)
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Suppress on login/setup/customer routes
  const isSuppressed = SUPPRESSED_PATHS.some((p) => pathname?.startsWith(p));
  if (isSuppressed) return null;

  function handleToggle() {
    toggleTheme();
    setIsDark((prev) => !prev);
  }

  return (
    <div
      className="flex items-center justify-between px-4"
      style={{
        height: 44,
        background: 'var(--kata-surface-container)',
        borderBottom: '1px solid var(--kata-stroke-subtle)',
      }}
    >
      {/* Left: breadcrumb / title */}
      <span
        className="text-sm font-medium truncate"
        style={{ color: 'var(--kata-on-canvas)' }}
      >
        {title}
      </span>

      {/* Right: ctaSlot + theme toggle */}
      <div className="flex items-center gap-2">
        {ctaSlot}
        <button
          onClick={handleToggle}
          className="flex items-center justify-center rounded transition-colors"
          style={{
            width: 28,
            height: 28,
            color: 'var(--kata-on-canvas)',
            background: 'transparent',
          }}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <Icon
            name={isDark ? 'light_mode' : 'dark_mode'}
            size={18}
          />
        </button>
      </div>
    </div>
  );
}
