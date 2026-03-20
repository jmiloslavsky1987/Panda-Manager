// bigpanda-app/app/customer/[id]/skills/page.tsx
// Server Component shell — fetches recent runs server-side, renders SkillsTabClient
import { SkillsTabClient } from '../../../../components/SkillsTabClient';
import db from '../../../../db';
import { skillRuns } from '../../../../db/schema';
import { eq, desc } from 'drizzle-orm';

export default async function SkillsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = parseInt(id);

  const recentRuns = await db
    .select()
    .from(skillRuns)
    .where(eq(skillRuns.project_id, projectId))
    .orderBy(desc(skillRuns.created_at))
    .limit(10);

  return <SkillsTabClient projectId={projectId} recentRuns={recentRuns} />;
}
