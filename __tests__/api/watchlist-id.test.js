/**
 * @jest-environment node
 */

/**
 * Watchlist [id] API Tests
 */

import { mockSession, mockWatchlistItem } from './helpers';

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    watchlistItem: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}));

import prisma from '@/lib/prisma';
import { DELETE, PATCH } from '@/app/api/watchlist/[id]/route';
import { getSession } from '@/lib/auth';

describe('Watchlist [id] API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DELETE /api/watchlist/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      getSession.mockResolvedValue(null);

      const request = { url: 'http://localhost:3003/api/watchlist/123' };
      const response = await DELETE(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if item not found', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.watchlistItem.findUnique.mockResolvedValue(null);

      const request = { url: 'http://localhost:3003/api/watchlist/123' };
      const response = await DELETE(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Item not found');
    });

    it('should return 403 if item belongs to another user', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.watchlistItem.findUnique.mockResolvedValue({
        ...mockWatchlistItem,
        userId: 'different-user-id',
      });

      const request = { url: 'http://localhost:3003/api/watchlist/123' };
      const response = await DELETE(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should delete item successfully', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.watchlistItem.findUnique.mockResolvedValue(mockWatchlistItem);
      prisma.watchlistItem.delete.mockResolvedValue(mockWatchlistItem);

      const request = { url: 'http://localhost:3003/api/watchlist/123' };
      const response = await DELETE(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('PATCH /api/watchlist/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      getSession.mockResolvedValue(null);

      const request = {
        url: 'http://localhost:3003/api/watchlist/123',
        json: async () => ({ notes: 'Test notes' }),
      };
      const response = await PATCH(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if item not found', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.watchlistItem.findUnique.mockResolvedValue(null);

      const request = {
        url: 'http://localhost:3003/api/watchlist/123',
        json: async () => ({ notes: 'Test notes' }),
      };
      const response = await PATCH(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Item not found');
    });

    it('should return 403 if item belongs to another user', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.watchlistItem.findUnique.mockResolvedValue({
        ...mockWatchlistItem,
        userId: 'different-user-id',
      });

      const request = {
        url: 'http://localhost:3003/api/watchlist/123',
        json: async () => ({ notes: 'Test notes' }),
      };
      const response = await PATCH(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should update notes successfully', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.watchlistItem.findUnique.mockResolvedValue(mockWatchlistItem);
      prisma.watchlistItem.update.mockResolvedValue({
        ...mockWatchlistItem,
        notes: 'Updated notes',
      });

      const request = {
        url: 'http://localhost:3003/api/watchlist/123',
        json: async () => ({ notes: 'Updated notes' }),
      };
      const response = await PATCH(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.watchlistItem.notes).toBe('Updated notes');
    });
  });
});
