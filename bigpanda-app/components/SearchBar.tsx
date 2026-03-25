'use client';

import { useState, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';

export function SearchBar() {
  const [value, setValue] = useState('');
  const router = useRouter();

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && value.trim()) {
      router.push('/search?q=' + encodeURIComponent(value.trim()));
    }
  }

  return (
    <input
      data-testid="search-bar"
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder="Search all projects..."
      className="w-64 sm:w-full max-w-sm rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-300"
    />
  );
}
