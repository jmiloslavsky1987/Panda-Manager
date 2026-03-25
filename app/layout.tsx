import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '../components/Sidebar';
import { SearchBar } from '../components/SearchBar';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'BigPanda PS',
  description: 'BigPanda Professional Services Project Assistant',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        {/* frappe-gantt CSS loaded from public/ — avoids Tailwind 4 PostCSS style-condition resolver issue */}
        <link rel="stylesheet" href="/frappe-gantt.css" />
      </head>
      <body className="h-full flex bg-zinc-50">
        <Sidebar />
        <main className="ml-60 flex-1 min-h-screen overflow-y-auto">
          <div className="flex items-center justify-between border-b px-6 py-2 bg-white sticky top-0 z-10">
            <SearchBar />
          </div>
          {children}
        </main>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
