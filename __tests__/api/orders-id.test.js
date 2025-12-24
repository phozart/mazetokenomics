/**
 * @jest-environment node
 */

/**
 * Orders [id] API Tests
 */

import { mockOrder, mockSession } from './helpers';

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    order: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}));

import prisma from '@/lib/prisma';
import { GET, PUT, DELETE } from '@/app/api/orders/[id]/route';
import { getSession } from '@/lib/auth';

describe('Orders [id] API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/orders/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      getSession.mockResolvedValue(null);

      const request = { url: 'http://localhost:3003/api/orders/123' };
      const response = await GET(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if order not found', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.order.findFirst.mockResolvedValue(null);

      const request = { url: 'http://localhost:3003/api/orders/123' };
      const response = await GET(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Order not found');
    });

    it('should return order if found', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.order.findFirst.mockResolvedValue(mockOrder);

      const request = { url: 'http://localhost:3003/api/orders/123' };
      const response = await GET(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.order).toBeDefined();
    });
  });

  describe('PUT /api/orders/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      getSession.mockResolvedValue(null);

      const request = {
        url: 'http://localhost:3003/api/orders/123',
        json: async () => ({}),
      };
      const response = await PUT(request, { params: Promise.resolve({ id: '123' }) });

      expect(response.status).toBe(401);
    });

    it('should return 404 if order not found', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.order.findFirst.mockResolvedValue(null);

      const request = {
        url: 'http://localhost:3003/api/orders/123',
        json: async () => ({ triggerPrice: 0.002 }),
      };
      const response = await PUT(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Order not found');
    });

    it('should update order successfully', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.order.findFirst.mockResolvedValue({ ...mockOrder, status: 'active' });
      prisma.order.update.mockResolvedValue({ ...mockOrder, triggerPrice: 0.002 });

      const request = {
        url: 'http://localhost:3003/api/orders/123',
        json: async () => ({ triggerPrice: 0.002 }),
      };
      const response = await PUT(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 400 if trying to update non-active order', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.order.findFirst.mockResolvedValue({ ...mockOrder, status: 'completed' });

      const request = {
        url: 'http://localhost:3003/api/orders/123',
        json: async () => ({ triggerPrice: 0.002 }),
      };
      const response = await PUT(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cannot update non-active orders');
    });
  });

  describe('DELETE /api/orders/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      getSession.mockResolvedValue(null);

      const request = { url: 'http://localhost:3003/api/orders/123' };
      const response = await DELETE(request, { params: Promise.resolve({ id: '123' }) });

      expect(response.status).toBe(401);
    });

    it('should return 404 if order not found', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.order.findFirst.mockResolvedValue(null);

      const request = { url: 'http://localhost:3003/api/orders/123' };
      const response = await DELETE(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Order not found');
    });

    it('should cancel order successfully', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.order.findFirst.mockResolvedValue(mockOrder);
      prisma.order.update.mockResolvedValue({ ...mockOrder, status: 'cancelled' });

      const request = { url: 'http://localhost:3003/api/orders/123' };
      const response = await DELETE(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
