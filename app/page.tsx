import { getPortfolioData } from '@/lib/queries';
import { PortfolioSummaryChips } from '@/components/PortfolioSummaryChips';
import { PortfolioTableClient } from '@/components/PortfolioTableClient';
import { PortfolioExceptionsPanel } from '@/components/PortfolioExceptionsPanel';
import { NewProjectButton } from '@/components/NewProjectButton';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { resolveRole } from '@/lib/auth-utils';

export default async function PortfolioDashboardPage() {
  // Read session server-side (same pattern as requireSession() but without redirect)
  const session = await auth.api.getSession({ headers: await headers() });

  const userId = session?.user?.id;
  const isGlobalAdmin = session ? resolveRole(session) === 'admin' : false;

  const projects = await getPortfolioData({ userId, isGlobalAdmin });

  return (
    <div className="p-6 space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Portfolio Dashboard</h1>
        <NewProjectButton />
      </div>

      {/* Health summary chips */}
      <PortfolioSummaryChips projects={projects} />

      {/* Portfolio table with filters */}
      <PortfolioTableClient projects={projects} />

      {/* Exceptions panel */}
      <PortfolioExceptionsPanel projects={projects} />
    </div>
  );
}
