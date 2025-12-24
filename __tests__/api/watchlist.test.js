/**
 * @jest-environment node
 */

// Mock Prisma - must be defined inside the mock factory
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    watchlistItem: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    token: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}));

jest.mock('@/lib/api/dexscreener', () => ({
  getTokenPairs: jest.fn(() => Promise.resolve({
    pairs: [{
      baseToken: { symbol: 'TEST', name: 'Test Token' },
      priceUsd: '1.00',
      priceChange: { h24: 5.5 },
      marketCap: 1000000,
    }],
  })),
}));

import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { GET, POST } from '@/app/api/watchlist/route';

describe('/api/watchlist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSession.mockResolvedValue({
      user: {
        id: 'test-user-id',
        email: 'test@test.com',
        name: 'Test User',
        role: 'USER',
      },
    });
  });

  describe('GET /api/watchlist', () => {
    it('should return user watchlist', async () => {
      const mockWatchlist = [
        {
          id: '1',
          userId: 'test-user-id',
          contractAddress: '0x123',
          chain: 'ETHEREUM',
          symbol: 'TEST',
          token: { vettingProcess: { id: 'vp-1', overallScore: 80 } },
        },
      ];

      prisma.watchlistItem.findMany.mockResolvedValue(mockWatchlist);
      prisma.token.findFirst.mockResolvedValue(null);

      const request = new Request('http://localhost/api/watchlist');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.watchlist).toBeDefined();
    });

    it('should return 401 for unauthenticated requests', async () => {
      getSession.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/watchlist');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('POST /api/watchlist', () => {
    it('should add token to watchlist', async () => {
      const mockWatchlistItem = {
        id: 'watchlist-1',
        userId: 'test-user-id',
        contractAddress: '0x123',
        chain: 'SOLANA',
        symbol: 'TEST',
        name: 'Test Token',
        token: null,
      };

      prisma.watchlistItem.findFirst.mockResolvedValue(null);
      prisma.token.findFirst.mockResolvedValue(null);
      prisma.token.create.mockResolvedValue({ id: 'token-1', contractAddress: '0x123', chain: 'SOLANA' });
      prisma.watchlistItem.create.mockResolvedValue(mockWatchlistItem);

      const request = new Request('http://localhost/api/watchlist', {
        method: 'POST',
        body: JSON.stringify({
          contractAddress: '0x123',
          chain: 'SOLANA',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.watchlistItem).toBeDefined();
    });

    it('should return 409 if already in watchlist', async () => {
      prisma.watchlistItem.findFirst.mockResolvedValue({ id: 'existing' });

      const request = new Request('http://localhost/api/watchlist', {
        method: 'POST',
        body: JSON.stringify({
          contractAddress: '0x123',
          chain: 'ETHEREUM',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Already in watchlist');
    });

    it('should return 400 for missing required fields', async () => {
      const request = new Request('http://localhost/api/watchlist', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
    });
  });
});
