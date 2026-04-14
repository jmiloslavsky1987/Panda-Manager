import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PATCH } from '@/app/api/projects/[projectId]/route';
import * as authServer from '@/lib/auth-server';
import * as seedProject from '@/lib/seed-project';
import * as db_module from '@/db';

// Mock database
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    insert: vi.fn(),
  },
}));

describe('Project Archive API', () => {
  let mockSession: any;
  let mockProjectId: number;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProjectId = 123;
    mockSession = { user: { id: 'test-user-id' } };
  });

  describe('PATCH /api/projects/[projectId] - Archive', () => {
    it('returns 200 when caller is admin and archives project', async () => {
      // Mock admin authorization
      vi.spyOn(authServer, 'requireProjectRole').mockResolvedValue({
        session: mockSession,
        redirectResponse: null,
        projectRole: 'admin',
      });

      // Mock database update
      const mockReturning = vi.fn().mockResolvedValue([{ id: mockProjectId }]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      (db_module.db.update as any) = vi.fn().mockReturnValue({ set: mockSet });

      const req = new NextRequest('http://localhost:3000/api/projects/' + mockProjectId, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'archived' }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ projectId: String(mockProjectId) }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
    });

    it('returns 403 when caller is not admin', async () => {
      // Mock non-admin authorization failure
      vi.spyOn(authServer, 'requireProjectRole').mockResolvedValue({
        session: null,
        redirectResponse: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
        projectRole: null,
      });

      const req = new NextRequest('http://localhost:3000/api/projects/' + mockProjectId, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'archived' }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ projectId: String(mockProjectId) }) });

      expect(response.status).toBe(403);
    });

    it('sets project status to archived in database', async () => {
      vi.spyOn(authServer, 'requireProjectRole').mockResolvedValue({
        session: mockSession,
        redirectResponse: null,
        projectRole: 'admin',
      });

      const mockReturning = vi.fn().mockResolvedValue([{ id: mockProjectId }]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockWhere });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      (db_module.db.update as any) = vi.fn().mockReturnValue({ set: mockSet });

      const req = new NextRequest('http://localhost:3000/api/projects/' + mockProjectId, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'archived' }),
      });

      await PATCH(req, { params: Promise.resolve({ projectId: String(mockProjectId) }) });

      // Verify update was called with correct params
      expect(db_module.db.update).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ status: 'archived' }));
    });

    it('returns 404 when project does not exist', async () => {
      const nonExistentId = 99999;
      vi.spyOn(authServer, 'requireProjectRole').mockResolvedValue({
        session: mockSession,
        redirectResponse: null,
        projectRole: 'admin',
      });

      // Mock empty result (project not found)
      const mockReturning = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      (db_module.db.update as any) = vi.fn().mockReturnValue({ set: mockSet });

      const req = new NextRequest('http://localhost:3000/api/projects/' + nonExistentId, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'archived' }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ projectId: String(nonExistentId) }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Project not found');
    });

    it('does not call seedProjectFromRegistry on archive', async () => {
      vi.spyOn(authServer, 'requireProjectRole').mockResolvedValue({
        session: mockSession,
        redirectResponse: null,
        projectRole: 'admin',
      });

      const mockReturning = vi.fn().mockResolvedValue([{ id: mockProjectId }]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockWhere });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      (db_module.db.update as any) = vi.fn().mockReturnValue({ set: mockSet });

      const seedSpy = vi.spyOn(seedProject, 'seedProjectFromRegistry').mockResolvedValue(undefined);

      const req = new NextRequest('http://localhost:3000/api/projects/' + mockProjectId, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'archived' }),
      });

      await PATCH(req, { params: Promise.resolve({ projectId: String(mockProjectId) }) });

      expect(seedSpy).not.toHaveBeenCalled();
    });
  });

  describe('Authorization - Archive requires admin', () => {
    it('allows admin to archive active project', async () => {
      vi.spyOn(authServer, 'requireProjectRole').mockResolvedValue({
        session: mockSession,
        redirectResponse: null,
        projectRole: 'admin',
      });

      const mockReturning = vi.fn().mockResolvedValue([{ id: mockProjectId }]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockWhere });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      (db_module.db.update as any) = vi.fn().mockReturnValue({ set: mockSet });

      const req = new NextRequest('http://localhost:3000/api/projects/' + mockProjectId, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'archived' }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ projectId: String(mockProjectId) }) });

      expect(response.status).toBe(200);
      expect(authServer.requireProjectRole).toHaveBeenCalledWith(mockProjectId, 'admin');
    });

    it('prevents user role from archiving project', async () => {
      vi.spyOn(authServer, 'requireProjectRole').mockResolvedValue({
        session: null,
        redirectResponse: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
        projectRole: null,
      });

      const req = new NextRequest('http://localhost:3000/api/projects/' + mockProjectId, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'archived' }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ projectId: String(mockProjectId) }) });

      expect(response.status).toBe(403);
    });
  });
});
