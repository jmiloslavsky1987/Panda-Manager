import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '../components/Sidebar';
import { SearchBar } from '../components/SearchBar';
import { AuthProvider } from '../components/AuthProvider';
import { AppChrome } from '../components/AppChrome';
import { HeaderBar } from '../components/HeaderBar';
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
        <AuthProvider>
          {/* AppChrome accepts server components as children — composition pattern required
              because Sidebar is an async server component (DB fetch) */}
          <AppChrome>
            <Sidebar />
          </AppChrome>
          <main className="ml-60 flex-1 min-h-screen overflow-y-auto">
            {/* HeaderBar suppresses the search header on /login and /setup routes */}
            <HeaderBar>
              <SearchBar />
            </HeaderBar>
            {children}
          </main>
          <Toaster position="bottom-right" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}
