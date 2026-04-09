import { getPortfolioData } from '@/lib/queries';
import { PortfolioSummaryChips } from '@/components/PortfolioSummaryChips';
import { PortfolioTableClient } from '@/components/PortfolioTableClient';
import { PortfolioExceptionsPanel } from '@/components/PortfolioExceptionsPanel';
import { NewProjectButton } from '@/components/NewProjectButton';

export default async function PortfolioDashboardPage() {
  const projects = await getPortfolioData();

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
