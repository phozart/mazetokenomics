/**
 * @jest-environment node
 */

/**
 * Packs API Tests
 */

import { mockUser, mockPack, mockSession } from './helpers';

// Mock Prisma - define inline to avoid hoisting issues
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    pack: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    packToken: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}));

import prisma from '@/lib/prisma';
import { GET, POST } from '@/app/api/packs/route';
import { getSession } from '@/lib/auth';

describe('Packs API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/packs', () => {
    it('should return 401 if not authenticated', async () => {
      getSession.mockResolvedValue(null);

      const request = { url: 'http://localhost:3003/api/packs' };
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return user packs', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.pack.findMany.mockResolvedValue([mockPack]);

      const request = { url: 'http://localhost:3003/api/packs' };
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.packs).toBeDefined();
      expect(Array.isArray(data.packs)).toBe(true);
    });
  });

  describe('POST /api/packs', () => {
    it('should return 401 if not authenticated', async () => {
      getSession.mockResolvedValue(null);

      const request = {
        url: 'http://localhost:3003/api/packs',
        json: async () => ({ name: 'Test Pack' }),
      };

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should create a new pack', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.pack.create.mockResolvedValue(mockPack);

      const request = {
        url: 'http://localhost:3003/api/packs',
        json: async () => ({
          name: 'Test Pack',
          description: 'A test pack',
          riskLevel: 'medium',
          tokens: [
            { tokenAddress: 'address1', symbol: 'TKN1', name: 'Token 1', weight: 50 },
            { tokenAddress: 'address2', symbol: 'TKN2', name: 'Token 2', weight: 50 },
          ],
        }),
      };

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pack).toBeDefined();
    });

    it('should return 400 if name missing', async () => {
      getSession.mockResolvedValue(mockSession);

      const request = {
        url: 'http://localhost:3003/api/packs',
        json: async () => ({}),
      };

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
    });
  });
});
