// bigpanda-app/app/customer/[id]/skills/page.tsx
// Server Component shell — fetches recent runs server-side, renders SkillsTabClient
import { SkillsTabClient } from '../../../../components/SkillsTabClient';
import { getSkillRuns } from '../../../../lib/queries';

export default async function SkillsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = parseInt(id);

  let recentRuns: Awaited<ReturnType<typeof getSkillRuns>> = [];
  try {
    recentRuns = await getSkillRuns(projectId, 10);
  } catch {
    // DB not available — render empty recent runs list
  }

  return <SkillsTabClient projectId={projectId} recentRuns={recentRuns} />;
}
