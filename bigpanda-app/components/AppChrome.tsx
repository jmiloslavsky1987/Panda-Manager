"use client";
import { usePathname } from "next/navigation";

// Routes where app chrome (Sidebar + SearchBar) must be suppressed
const NO_CHROME_PATHS = ["/login", "/setup"];

interface AppChromeProps {
  children: React.ReactNode;
}

/**
 * AppChrome — client component that conditionally renders Sidebar (and other chrome).
 * On /login and /setup routes, renders nothing (pure auth pages, no chrome).
 * On all other routes, renders whatever is passed as children.
 *
 * Usage in layout.tsx (server component):
 *   <AppChrome><Sidebar /></AppChrome>
 *
 * This composition pattern (server components as children) is required because
 * Sidebar is an async server component (fetches DB) and cannot be imported directly
 * from a client component.
 */
export function AppChrome({ children }: AppChromeProps) {
  const pathname = usePathname();
  const showChrome = !NO_CHROME_PATHS.some((p) => pathname.startsWith(p));
  if (!showChrome) return null;
  return <>{children}</>;
}
