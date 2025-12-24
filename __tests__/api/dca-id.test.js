/**
 * @jest-environment node
 */

/**
 * DCA [id] API Tests
 */

import { mockDcaSchedule, mockSession } from './helpers';

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    dcaSchedule: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}));

import prisma from '@/lib/prisma';
import { GET, PUT, DELETE } from '@/app/api/dca/[id]/route';
import { getSession } from '@/lib/auth';

describe('DCA [id] API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/dca/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      getSession.mockResolvedValue(null);

      const request = { url: 'http://localhost:3003/api/dca/123' };
      const response = await GET(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if schedule not found', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.dcaSchedule.findFirst.mockResolvedValue(null);

      const request = { url: 'http://localhost:3003/api/dca/123' };
      const response = await GET(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('DCA schedule not found');
    });

    it('should return schedule if found', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.dcaSchedule.findFirst.mockResolvedValue(mockDcaSchedule);

      const request = { url: 'http://localhost:3003/api/dca/123' };
      const response = await GET(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.schedule).toBeDefined();
    });
  });

  describe('PUT /api/dca/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      getSession.mockResolvedValue(null);

      const request = {
        url: 'http://localhost:3003/api/dca/123',
        json: async () => ({}),
      };
      const response = await PUT(request, { params: Promise.resolve({ id: '123' }) });

      expect(response.status).toBe(401);
    });

    it('should return 404 if schedule not found', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.dcaSchedule.findFirst.mockResolvedValue(null);

      const request = {
        url: 'http://localhost:3003/api/dca/123',
        json: async () => ({ status: 'paused' }),
      };
      const response = await PUT(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('DCA schedule not found');
    });

    it('should pause active schedule', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.dcaSchedule.findFirst.mockResolvedValue({ ...mockDcaSchedule, status: 'active' });
      prisma.dcaSchedule.update.mockResolvedValue({ ...mockDcaSchedule, status: 'paused' });

      const request = {
        url: 'http://localhost:3003/api/dca/123',
        json: async () => ({ status: 'paused' }),
      };
      const response = await PUT(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 400 if trying to modify completed schedule', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.dcaSchedule.findFirst.mockResolvedValue({ ...mockDcaSchedule, status: 'completed' });

      const request = {
        url: 'http://localhost:3003/api/dca/123',
        json: async () => ({ amountPerPeriod: 2.0 }),
      };
      const response = await PUT(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cannot modify completed or cancelled schedules');
    });
  });

  describe('DELETE /api/dca/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      getSession.mockResolvedValue(null);

      const request = { url: 'http://localhost:3003/api/dca/123' };
      const response = await DELETE(request, { params: Promise.resolve({ id: '123' }) });

      expect(response.status).toBe(401);
    });

    it('should return 404 if schedule not found', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.dcaSchedule.findFirst.mockResolvedValue(null);

      const request = { url: 'http://localhost:3003/api/dca/123' };
      const response = await DELETE(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('DCA schedule not found');
    });

    it('should cancel schedule successfully', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.dcaSchedule.findFirst.mockResolvedValue(mockDcaSchedule);
      prisma.dcaSchedule.update.mockResolvedValue({ ...mockDcaSchedule, status: 'cancelled' });

      const request = { url: 'http://localhost:3003/api/dca/123' };
      const response = await DELETE(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
