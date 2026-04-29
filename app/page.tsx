/**
 * PortfolioDashboardPage
 * Phase 81: KDS-05 — Portfolio Dashboard rebuild to Kata Design System spec
 *
 * Rebuilt layout:
 *  1. PortfolioHeroStats  — JBM 64px project count, RAG breakdown, week metrics
 *  2. PortfolioBriefingStrip — 3-column computed briefing cards (no AI calls)
 *  3. PortfolioProjectGrid — 2-column health-accented project cards
 *
 * Old components (PortfolioSummaryChips, PortfolioTableClient,
 * PortfolioExceptionsPanel) are removed from this page. Their files
 * remain in the codebase but are no longer used here.
 */

import { getPortfolioData, getPortfolioBriefingData, getPortfolioWeekMetrics } from '@/lib/queries';
import { PortfolioHeroStats } from '@/components/PortfolioHeroStats';
import { PortfolioBriefingStrip } from '@/components/PortfolioBriefingStrip';
import { PortfolioProjectGrid } from '@/components/PortfolioProjectGrid';
import { NewProjectButton } from '@/components/NewProjectButton';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { resolveRole } from '@/lib/auth-utils';
import { PageBarTitleSetter } from '@/components/PageBarTitleSetter';

export const dynamic = 'force-dynamic';

export default async function PortfolioDashboardPage() {
  // Read session server-side (same pattern as requireSession() but without redirect)
  const session = await auth.api.getSession({ headers: await headers() });

  const userId = session?.user?.id;
  const isGlobalAdmin = session ? resolveRole(session) === 'admin' : false;

  const [projects, briefingData, weekMetrics] = await Promise.all([
    getPortfolioData({ userId, isGlobalAdmin }),
    getPortfolioBriefingData({ userId, isGlobalAdmin }),
    getPortfolioWeekMetrics({ userId, isGlobalAdmin }),
  ]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--kata-surface-canvas)' }}>
      {/* Set PageBar title — client island injects into PageBarContext */}
      <PageBarTitleSetter title="Portfolio" ctaSlot={<NewProjectButton />} />

      <PortfolioHeroStats projects={projects} weekMetrics={weekMetrics} />

      <div className="px-8 py-6 space-y-6">
        <PortfolioBriefingStrip data={briefingData} />
        <PortfolioProjectGrid projects={projects} />
      </div>
    </div>
  );
}
