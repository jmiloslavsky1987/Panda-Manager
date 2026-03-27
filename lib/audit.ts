import { db } from '@/db';
import { auditLog } from '@/db/schema';

export async function writeAuditLog(params: {
  entityType: string;
  entityId: number | null;
  action: 'create' | 'update' | 'delete';
  actorId?: string;
  beforeJson?: Record<string, unknown> | null;
  afterJson?: Record<string, unknown> | null;
}): Promise<void> {
  await db.insert(auditLog).values({
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    action: params.action,
    actor_id: params.actorId ?? 'default',
    before_json: params.beforeJson ?? null,
    after_json: params.afterJson ?? null,
  });
}
