"use client";
import { usePathname } from "next/navigation";

// Routes where the top header bar (SearchBar) must be suppressed
const NO_CHROME_PATHS = ["/login", "/setup"];

interface HeaderBarProps {
  children: React.ReactNode;
}

/**
 * HeaderBar — client component that suppresses the SearchBar header on auth routes.
 * Renders the sticky top bar with SearchBar on all normal pages.
 * On /login and /setup, renders nothing.
 */
export function HeaderBar({ children }: HeaderBarProps) {
  const pathname = usePathname();
  const showHeader = !NO_CHROME_PATHS.some((p) => pathname.startsWith(p));
  if (!showHeader) return null;
  return (
    <div className="flex items-center justify-between border-b px-6 py-2 bg-white sticky top-0 z-10">
      {children}
    </div>
  );
}
