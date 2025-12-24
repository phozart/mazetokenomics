/**
 * @jest-environment node
 */

/**
 * Packs [id] API Tests
 */

import { mockPack, mockSession } from './helpers';

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    pack: {
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    packToken: {
      deleteMany: jest.fn(),
    },
    dcaSchedule: {
      count: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}));

import prisma from '@/lib/prisma';
import { GET, PUT, DELETE } from '@/app/api/packs/[id]/route';
import { getSession } from '@/lib/auth';

describe('Packs [id] API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/packs/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      getSession.mockResolvedValue(null);

      const request = { url: 'http://localhost:3003/api/packs/123' };
      const response = await GET(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if pack not found', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.pack.findFirst.mockResolvedValue(null);

      const request = { url: 'http://localhost:3003/api/packs/123' };
      const response = await GET(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Pack not found');
    });

    it('should return pack if found', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.pack.findFirst.mockResolvedValue(mockPack);

      const request = { url: 'http://localhost:3003/api/packs/123' };
      const response = await GET(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pack).toBeDefined();
    });
  });

  describe('PUT /api/packs/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      getSession.mockResolvedValue(null);

      const request = {
        url: 'http://localhost:3003/api/packs/123',
        json: async () => ({}),
      };
      const response = await PUT(request, { params: Promise.resolve({ id: '123' }) });

      expect(response.status).toBe(401);
    });

    it('should return 404 if pack not found', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.pack.findFirst.mockResolvedValue(null);

      const request = {
        url: 'http://localhost:3003/api/packs/123',
        json: async () => ({ name: 'Updated Pack' }),
      };
      const response = await PUT(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Pack not found');
    });

    it('should update pack name', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.pack.findFirst.mockResolvedValue(mockPack);
      prisma.pack.update.mockResolvedValue({ ...mockPack, name: 'Updated Pack' });

      const request = {
        url: 'http://localhost:3003/api/packs/123',
        json: async () => ({ name: 'Updated Pack' }),
      };
      const response = await PUT(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 400 if token weights do not sum to 100', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.pack.findFirst.mockResolvedValue(mockPack);

      const request = {
        url: 'http://localhost:3003/api/packs/123',
        json: async () => ({
          tokens: [
            { tokenAddress: 'addr1', symbol: 'TKN1', weight: 30 },
            { tokenAddress: 'addr2', symbol: 'TKN2', weight: 30 },
          ],
        }),
      };
      const response = await PUT(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Weights must sum to 100%');
    });

    it('should return 400 if no tokens provided', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.pack.findFirst.mockResolvedValue(mockPack);

      const request = {
        url: 'http://localhost:3003/api/packs/123',
        json: async () => ({ tokens: [] }),
      };
      const response = await PUT(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('At least one token is required');
    });
  });

  describe('DELETE /api/packs/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      getSession.mockResolvedValue(null);

      const request = { url: 'http://localhost:3003/api/packs/123' };
      const response = await DELETE(request, { params: Promise.resolve({ id: '123' }) });

      expect(response.status).toBe(401);
    });

    it('should return 404 if pack not found', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.pack.findFirst.mockResolvedValue(null);

      const request = { url: 'http://localhost:3003/api/packs/123' };
      const response = await DELETE(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Pack not found');
    });

    it('should return 400 if pack has active DCA schedules', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.pack.findFirst.mockResolvedValue(mockPack);
      prisma.dcaSchedule.count.mockResolvedValue(1);

      const request = { url: 'http://localhost:3003/api/packs/123' };
      const response = await DELETE(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('active DCA schedules');
    });

    it('should delete pack successfully', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.pack.findFirst.mockResolvedValue(mockPack);
      prisma.dcaSchedule.count.mockResolvedValue(0);
      prisma.pack.delete.mockResolvedValue(mockPack);

      const request = { url: 'http://localhost:3003/api/packs/123' };
      const response = await DELETE(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
