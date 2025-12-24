/**
 * @jest-environment node
 */

/**
 * DCA API Tests
 */

import { mockUser, mockDcaSchedule, mockSession } from './helpers';

// Mock Prisma - define inline to avoid hoisting issues
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    dcaSchedule: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    dcaExecution: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}));

import prisma from '@/lib/prisma';
import { GET, POST } from '@/app/api/dca/route';
import { getSession } from '@/lib/auth';

describe('DCA API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/dca', () => {
    it('should return 401 if not authenticated', async () => {
      getSession.mockResolvedValue(null);

      const request = { url: 'http://localhost:3003/api/dca' };
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return user DCA schedules', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.dcaSchedule.findMany.mockResolvedValue([mockDcaSchedule]);

      const request = { url: 'http://localhost:3003/api/dca' };
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.schedules).toBeDefined();
      expect(Array.isArray(data.schedules)).toBe(true);
    });

    it('should filter by status', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.dcaSchedule.findMany.mockResolvedValue([mockDcaSchedule]);

      const request = { url: 'http://localhost:3003/api/dca?status=active' };
      const response = await GET(request);

      expect(prisma.dcaSchedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'active',
          }),
        })
      );
    });
  });

  describe('POST /api/dca', () => {
    it('should return 401 if not authenticated', async () => {
      getSession.mockResolvedValue(null);

      const request = {
        url: 'http://localhost:3003/api/dca',
        json: async () => ({}),
      };

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should create a new DCA schedule', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.dcaSchedule.create.mockResolvedValue(mockDcaSchedule);

      const request = {
        url: 'http://localhost:3003/api/dca',
        json: async () => ({
          name: 'Weekly SOL',
          tokenAddress: 'address123',
          symbol: 'SOL',
          totalBudget: 10.0,
          amountPerPeriod: 1.0,
          frequency: 'weekly',
        }),
      };

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.schedule).toBeDefined();
    });

    it('should return 400 if required fields missing', async () => {
      getSession.mockResolvedValue(mockSession);

      const request = {
        url: 'http://localhost:3003/api/dca',
        json: async () => ({}),
      };

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it('should validate frequency values', async () => {
      getSession.mockResolvedValue(mockSession);

      const request = {
        url: 'http://localhost:3003/api/dca',
        json: async () => ({
          name: 'Test DCA',
          tokenAddress: 'address123',
          symbol: 'TKN',
          totalBudget: 10.0,
          amountPerPeriod: 1.0,
          frequency: 'invalid_frequency',
        }),
      };

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
});
