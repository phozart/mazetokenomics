/**
 * @jest-environment node
 */

/**
 * Orders API Tests
 */

import { mockUser, mockOrder, mockSession } from './helpers';

// Mock Prisma - define inline to avoid hoisting issues
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    order: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}));

import prisma from '@/lib/prisma';
import { GET, POST } from '@/app/api/orders/route';
import { getSession } from '@/lib/auth';

describe('Orders API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/orders', () => {
    it('should return 401 if not authenticated', async () => {
      getSession.mockResolvedValue(null);

      const request = { url: 'http://localhost:3003/api/orders' };
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return user orders', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.order.findMany.mockResolvedValue([mockOrder]);

      const request = { url: 'http://localhost:3003/api/orders' };
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.orders).toBeDefined();
      expect(Array.isArray(data.orders)).toBe(true);
    });

    it('should filter by status', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.order.findMany.mockResolvedValue([mockOrder]);

      const request = { url: 'http://localhost:3003/api/orders?status=active' };
      const response = await GET(request);

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'active',
          }),
        })
      );
    });
  });

  describe('POST /api/orders', () => {
    it('should return 401 if not authenticated', async () => {
      getSession.mockResolvedValue(null);

      const request = {
        url: 'http://localhost:3003/api/orders',
        json: async () => ({}),
      };

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should create a new order', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.order.findFirst.mockResolvedValue(null);
      prisma.order.create.mockResolvedValue(mockOrder);

      const request = {
        url: 'http://localhost:3003/api/orders',
        json: async () => ({
          tokenAddress: 'address123',
          symbol: 'TKN',
          orderType: 'limit_buy',
          side: 'buy',
          amountSol: 1.0,
          triggerPrice: 0.001,
        }),
      };

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.order).toBeDefined();
    });

    it('should return 400 if required fields missing', async () => {
      getSession.mockResolvedValue(mockSession);

      const request = {
        url: 'http://localhost:3003/api/orders',
        json: async () => ({}),
      };

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
    });
  });
});
