'use client'

/**
 * Kata Design System — Theme Provider
 * Phase 81: KDS-08
 *
 * Reads the 'kata-theme' localStorage key on mount and applies the
 * correct theme class to <html>. Client-only — must be wrapped around
 * page children in layout.tsx.
 *
 * Flash-prevention is handled by an inline <script> in layout.tsx <head>
 * (executed before first paint), so the useEffect here is only for
 * client-side hydration consistency.
 */

import { useEffect } from 'react'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const saved = localStorage.getItem('kata-theme')
    if (saved === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  return <>{children}</>
}
