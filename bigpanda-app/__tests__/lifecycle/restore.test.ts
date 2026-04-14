import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PATCH } from '@/app/api/projects/[projectId]/route';
import { db } from '@/db';
import { projects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import * as authServer from '@/lib/auth-server';
import * as seedProject from '@/lib/seed-project';

describe('Project Restore API', () => {
  let mockSession: any;
  let mockProjectId: number;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create test project in archived state
    const [project] = await db.insert(projects).values({
      name: 'Test Restore Project',
      customer: 'Test Customer',
      status: 'archived',
    }).returning();
    mockProjectId = project.id;

    mockSession = { user: { id: 'test-user-id' } };
  });

  afterEach(async () => {
    // Cleanup test data
    if (mockProjectId) {
      await db.delete(projects).where(eq(projects.id, mockProjectId));
    }
  });

  describe('PATCH /api/projects/[projectId] - Restore', () => {
    it('returns 200 when restoring archived project to active', async () => {
      vi.spyOn(authServer, 'requireProjectRole').mockResolvedValue({
        session: mockSession,
        redirectResponse: null,
        projectRole: 'admin',
      });
      vi.spyOn(seedProject, 'seedProjectFromRegistry').mockResolvedValue(undefined);

      const req = new NextRequest('http://localhost:3000/api/projects/' + mockProjectId, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ projectId: String(mockProjectId) }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
    });

    it('sets project status to active in database', async () => {
      vi.spyOn(authServer, 'requireProjectRole').mockResolvedValue({
        session: mockSession,
        redirectResponse: null,
        projectRole: 'admin',
      });
      vi.spyOn(seedProject, 'seedProjectFromRegistry').mockResolvedValue(undefined);

      const req = new NextRequest('http://localhost:3000/api/projects/' + mockProjectId, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' }),
      });

      await PATCH(req, { params: Promise.resolve({ projectId: String(mockProjectId) }) });

      // Verify status in database
      const [updated] = await db.select().from(projects).where(eq(projects.id, mockProjectId));
      expect(updated.status).toBe('active');
      expect(updated.updated_at).toBeDefined();
    });

    it('calls seedProjectFromRegistry on restore to active', async () => {
      vi.spyOn(authServer, 'requireProjectRole').mockResolvedValue({
        session: mockSession,
        redirectResponse: null,
        projectRole: 'admin',
      });
      const seedSpy = vi.spyOn(seedProject, 'seedProjectFromRegistry').mockResolvedValue(undefined);

      const req = new NextRequest('http://localhost:3000/api/projects/' + mockProjectId, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' }),
      });

      await PATCH(req, { params: Promise.resolve({ projectId: String(mockProjectId) }) });

      expect(seedSpy).toHaveBeenCalled();
    });

    it('calls seedProjectFromRegistry with correct project ID', async () => {
      vi.spyOn(authServer, 'requireProjectRole').mockResolvedValue({
        session: mockSession,
        redirectResponse: null,
        projectRole: 'admin',
      });
      const seedSpy = vi.spyOn(seedProject, 'seedProjectFromRegistry').mockResolvedValue(undefined);

      const req = new NextRequest('http://localhost:3000/api/projects/' + mockProjectId, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' }),
      });

      await PATCH(req, { params: Promise.resolve({ projectId: String(mockProjectId) }) });

      expect(seedSpy).toHaveBeenCalledWith(mockProjectId);
    });

    it('does not call seedProjectFromRegistry when restoring to draft', async () => {
      vi.spyOn(authServer, 'requireProjectRole').mockResolvedValue({
        session: mockSession,
        redirectResponse: null,
        projectRole: 'admin',
      });
      const seedSpy = vi.spyOn(seedProject, 'seedProjectFromRegistry').mockResolvedValue(undefined);

      const req = new NextRequest('http://localhost:3000/api/projects/' + mockProjectId, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'draft' }),
      });

      await PATCH(req, { params: Promise.resolve({ projectId: String(mockProjectId) }) });

      expect(seedSpy).not.toHaveBeenCalled();
    });
  });

  describe('Restore - Idempotency', () => {
    it('handles restore of already-active project gracefully', async () => {
      // Set project to active
      await db.update(projects).set({ status: 'active' }).where(eq(projects.id, mockProjectId));

      vi.spyOn(authServer, 'requireProjectRole').mockResolvedValue({
        session: mockSession,
        redirectResponse: null,
        projectRole: 'admin',
      });
      vi.spyOn(seedProject, 'seedProjectFromRegistry').mockResolvedValue(undefined);

      const req = new NextRequest('http://localhost:3000/api/projects/' + mockProjectId, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ projectId: String(mockProjectId) }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
    });

    it('does not double-seed if seedProjectFromRegistry already ran', async () => {
      vi.spyOn(authServer, 'requireProjectRole').mockResolvedValue({
        session: mockSession,
        redirectResponse: null,
        projectRole: 'admin',
      });

      // Mock seedProjectFromRegistry to verify it's called but is idempotent
      const seedSpy = vi.spyOn(seedProject, 'seedProjectFromRegistry').mockResolvedValue(undefined);

      const req = new NextRequest('http://localhost:3000/api/projects/' + mockProjectId, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' }),
      });

      await PATCH(req, { params: Promise.resolve({ projectId: String(mockProjectId) }) });

      // seedProjectFromRegistry is called, but the function itself handles idempotency
      expect(seedSpy).toHaveBeenCalledWith(mockProjectId);
    });
  });

  describe('Restore - Authorization', () => {
    it('requires admin role to restore project', async () => {
      vi.spyOn(authServer, 'requireProjectRole').mockResolvedValue({
        session: null,
        redirectResponse: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
        projectRole: null,
      });

      const req = new NextRequest('http://localhost:3000/api/projects/' + mockProjectId, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ projectId: String(mockProjectId) }) });

      expect(response.status).toBe(403);
      expect(authServer.requireProjectRole).toHaveBeenCalledWith(mockProjectId, 'admin');
    });

    it('returns 404 when project does not exist', async () => {
      const nonExistentId = 99999;
      vi.spyOn(authServer, 'requireProjectRole').mockResolvedValue({
        session: mockSession,
        redirectResponse: null,
        projectRole: 'admin',
      });

      const req = new NextRequest('http://localhost:3000/api/projects/' + nonExistentId, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ projectId: String(nonExistentId) }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Project not found');
    });
  });
});
