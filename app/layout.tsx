import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Sidebar } from '../components/Sidebar';
import { AuthProvider } from '../components/AuthProvider';
import { AppChrome } from '../components/AppChrome';
import { PageBarProvider } from '../components/PageBarContext';
import { PageBar } from '../components/PageBar';
import { ThemeProvider } from '../components/ThemeProvider';
import { Toaster } from 'sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jbm = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jbm',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

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
    <html lang="en" className={`${inter.variable} ${jbm.variable} h-full`}>
      <head>
        {/* Flash-prevention: apply saved theme class before first paint to avoid FOUC */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('kata-theme');if(t==='dark')document.documentElement.classList.add('dark')})()`
          }}
        />
        {/* frappe-gantt CSS loaded from public/ — avoids Tailwind 4 PostCSS style-condition resolver issue */}
        <link rel="stylesheet" href="/frappe-gantt.css" />
        {/* Material Symbols Outlined — loaded via CDN for variable font-feature-settings support */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body className="h-full flex">
        <AuthProvider>
          <ThemeProvider>
            {/* AppChrome accepts server components as children — composition pattern required
                because Sidebar is an async server component (DB fetch) */}
            <AppChrome>
              <Sidebar />
            </AppChrome>
            <PageBarProvider>
              <main className="ml-60 flex-1 min-h-screen overflow-y-auto">
                <PageBar />
                {children}
              </main>
            </PageBarProvider>
            <Toaster position="bottom-right" richColors />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
