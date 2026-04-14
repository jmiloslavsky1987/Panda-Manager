import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { DELETE } from '@/app/api/projects/[projectId]/route';
import { db } from '@/db';
import { projects, skillRuns, extractionJobs, actions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import * as authServer from '@/lib/auth-server';

describe('Project Delete API', () => {
  let mockSession: any;
  let mockProjectId: number;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create test project
    const [project] = await db.insert(projects).values({
      name: 'Test Delete Project',
      customer: 'Test Customer',
      status: 'archived', // Start as archived for delete tests
    }).returning();
    mockProjectId = project.id;

    mockSession = { user: { id: 'test-user-id' } };
  });

  afterEach(async () => {
    // Cleanup test data
    if (mockProjectId) {
      await db.delete(skillRuns).where(eq(skillRuns.project_id, mockProjectId));
      await db.delete(extractionJobs).where(eq(extractionJobs.project_id, mockProjectId));
      await db.delete(projects).where(eq(projects.id, mockProjectId)).catch(() => {});
    }
  });

  describe('DELETE /api/projects/[projectId] - Pre-flight checks', () => {
    it('returns 409 if project status is not archived', async () => {
      // Update project to active status
      await db.update(projects).set({ status: 'active' }).where(eq(projects.id, mockProjectId));

      vi.spyOn(authServer, 'requireProjectRole').mockResolvedValue({
        session: mockSession,
        redirectResponse: null,
        projectRole: 'admin',
      });

      const req = new NextRequest('http://localhost:3000/api/projects/' + mockProjectId, {
        method: 'DELETE',
      });

      const response = await DELETE(req, { params: Promise.resolve({ projectId: String(mockProjectId) }) });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Project must be archived before permanent deletion');
    });

    it('returns 409 if there are pending skill_runs', async () => {
      // Create pending skill run
      await db.insert(skillRuns).values({
        run_id: 'test-run-pending',
        project_id: mockProjectId,
        skill_name: 'test-skill',
        status: 'pending',
      });

      vi.spyOn(authServer, 'requireProjectRole').mockResolvedValue({
        session: mockSession,
        redirectResponse: null,
        projectRole: 'admin',
      });

      const req = new NextRequest('http://localhost:3000/api/projects/' + mockProjectId, {
        method: 'DELETE',
      });

      const response = await DELETE(req, { params: Promise.resolve({ projectId: String(mockProjectId) }) });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Cannot delete project with active jobs running.');
    });

    it('returns 409 if there are running skill_runs', async () => {
      // Create running skill run
      await db.insert(skillRuns).values({
        run_id: 'test-run-running',
        project_id: mockProjectId,
        skill_name: 'test-skill',
        status: 'running',
      });

      vi.spyOn(authServer, 'requireProjectRole').mockResolvedValue({
        session: mockSession,
        redirectResponse: null,
        projectRole: 'admin',
      });

      const req = new NextRequest('http://localhost:3000/api/projects/' + mockProjectId, {
        method: 'DELETE',
      });

      const response = await DELETE(req, { params: Promise.resolve({ projectId: String(mockProjectId) }) });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Cannot delete project with active jobs running.');
    });

    it('returns 409 if there are pending extraction_jobs', async () => {
      // Create a dummy artifact first (extractionJobs needs artifact_id FK)
      const [artifact] = await db.insert(require('@/db/schema').artifacts).values({
        project_id: mockProjectId,
        external_id: 'X-TEST-001',
        name: 'Test Artifact',
        source: 'test',
      }).returning();

      await db.insert(extractionJobs).values({
        artifact_id: artifact.id,
        project_id: mockProjectId,
        batch_id: 'test-batch-pending',
        status: 'pending',
      });

      vi.spyOn(authServer, 'requireProjectRole').mockResolvedValue({
        session: mockSession,
        redirectResponse: null,
        projectRole: 'admin',
      });

      const req = new NextRequest('http://localhost:3000/api/projects/' + mockProjectId, {
        method: 'DELETE',
      });

      const response = await DELETE(req, { params: Promise.resolve({ projectId: String(mockProjectId) }) });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Cannot delete project with active jobs running.');
    });

    it('returns 409 if there are running extraction_jobs', async () => {
      // Create a dummy artifact first
      const [artifact] = await db.insert(require('@/db/schema').artifacts).values({
        project_id: mockProjectId,
        external_id: 'X-TEST-002',
        name: 'Test Artifact 2',
        source: 'test',
      }).returning();

      await db.insert(extractionJobs).values({
        artifact_id: artifact.id,
        project_id: mockProjectId,
        batch_id: 'test-batch-running',
        status: 'running',
      });

      vi.spyOn(authServer, 'requireProjectRole').mockResolvedValue({
        session: mockSession,
        redirectResponse: null,
        projectRole: 'admin',
      });

      const req = new NextRequest('http://localhost:3000/api/projects/' + mockProjectId, {
        method: 'DELETE',
      });

      const response = await DELETE(req, { params: Promise.resolve({ projectId: String(mockProjectId) }) });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Cannot delete project with active jobs running.');
    });
  });

  describe('DELETE /api/projects/[projectId] - Successful deletion', () => {
    it('returns 200 and removes project when archived with no active jobs', async () => {
      vi.spyOn(authServer, 'requireProjectRole').mockResolvedValue({
        session: mockSession,
        redirectResponse: null,
        projectRole: 'admin',
      });

      const req = new NextRequest('http://localhost:3000/api/projects/' + mockProjectId, {
        method: 'DELETE',
      });

      const response = await DELETE(req, { params: Promise.resolve({ projectId: String(mockProjectId) }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);

      // Verify project is removed
      const deletedProject = await db.select().from(projects).where(eq(projects.id, mockProjectId));
      expect(deletedProject.length).toBe(0);
    });

    it('cascades deletion to child tables', async () => {
      // Create child action
      const [action] = await db.insert(actions).values({
        project_id: mockProjectId,
        external_id: 'A-TEST-001',
        description: 'Test Action',
        source: 'test',
      }).returning();

      vi.spyOn(authServer, 'requireProjectRole').mockResolvedValue({
        session: mockSession,
        redirectResponse: null,
        projectRole: 'admin',
      });

      const req = new NextRequest('http://localhost:3000/api/projects/' + mockProjectId, {
        method: 'DELETE',
      });

      await DELETE(req, { params: Promise.resolve({ projectId: String(mockProjectId) }) });

      // Verify child action is also removed (cascade)
      const deletedActions = await db.select().from(actions).where(eq(actions.id, action.id));
      expect(deletedActions.length).toBe(0);
    });

    it('requires admin role to delete project', async () => {
      vi.spyOn(authServer, 'requireProjectRole').mockResolvedValue({
        session: null,
        redirectResponse: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
        projectRole: null,
      });

      const req = new NextRequest('http://localhost:3000/api/projects/' + mockProjectId, {
        method: 'DELETE',
      });

      const response = await DELETE(req, { params: Promise.resolve({ projectId: String(mockProjectId) }) });

      expect(response.status).toBe(403);
      expect(authServer.requireProjectRole).toHaveBeenCalledWith(mockProjectId, 'admin');
    });
  });

  describe('DELETE /api/projects/[projectId] - Edge cases', () => {
    it('returns 404 when project does not exist', async () => {
      const nonExistentId = 99999;
      vi.spyOn(authServer, 'requireProjectRole').mockResolvedValue({
        session: mockSession,
        redirectResponse: null,
        projectRole: 'admin',
      });

      const req = new NextRequest('http://localhost:3000/api/projects/' + nonExistentId, {
        method: 'DELETE',
      });

      const response = await DELETE(req, { params: Promise.resolve({ projectId: String(nonExistentId) }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Project not found');
    });

    it('allows deletion of archived project with completed jobs', async () => {
      // Create completed skill run
      await db.insert(skillRuns).values({
        run_id: 'test-run-completed',
        project_id: mockProjectId,
        skill_name: 'test-skill',
        status: 'completed',
      });

      vi.spyOn(authServer, 'requireProjectRole').mockResolvedValue({
        session: mockSession,
        redirectResponse: null,
        projectRole: 'admin',
      });

      const req = new NextRequest('http://localhost:3000/api/projects/' + mockProjectId, {
        method: 'DELETE',
      });

      const response = await DELETE(req, { params: Promise.resolve({ projectId: String(mockProjectId) }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
    });
  });
});
