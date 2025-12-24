/**
 * @jest-environment node
 */

/**
 * Tokens API Tests
 */

import { mockUser, mockToken, mockVettingProcess, mockSession } from './helpers';

// Mock Prisma - define inline to avoid hoisting issues
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    vettingProcess: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    token: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    manualCheck: {
      createMany: jest.fn(),
    },
    activity: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}));

jest.mock('@/lib/utils', () => ({
  isValidAddress: jest.fn(() => true),
  isSolanaAddress: jest.fn(() => true),
}));

jest.mock('@/lib/vetting/automated-checks', () => ({
  runAutomatedChecks: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/constants', () => ({
  MANUAL_CHECK_CONFIG: {
    CONTRACT_VERIFIED: { severity: 'HIGH' },
    TEAM_DOXXED: { severity: 'MEDIUM' },
  },
}));

import prisma from '@/lib/prisma';
import { GET, POST } from '@/app/api/tokens/route';
import { getSession } from '@/lib/auth';
import { isValidAddress } from '@/lib/utils';

describe('Tokens API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/tokens', () => {
    it('should return 401 if not authenticated', async () => {
      getSession.mockResolvedValue(null);

      const request = { url: 'http://localhost:3003/api/tokens' };
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return tokens list', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.vettingProcess.findMany.mockResolvedValue([mockVettingProcess]);
      prisma.vettingProcess.count.mockResolvedValue(1);

      const request = { url: 'http://localhost:3003/api/tokens' };
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tokens).toBeDefined();
      expect(data.total).toBe(1);
    });

    it('should filter by status', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.vettingProcess.findMany.mockResolvedValue([mockVettingProcess]);
      prisma.vettingProcess.count.mockResolvedValue(1);

      const request = { url: 'http://localhost:3003/api/tokens?status=COMPLETED' };
      const response = await GET(request);

      expect(prisma.vettingProcess.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'COMPLETED',
          }),
        })
      );
    });

    it('should handle pagination', async () => {
      getSession.mockResolvedValue(mockSession);
      prisma.vettingProcess.findMany.mockResolvedValue([mockVettingProcess]);
      prisma.vettingProcess.count.mockResolvedValue(100);

      const request = { url: 'http://localhost:3003/api/tokens?limit=10&offset=20' };
      const response = await GET(request);
      const data = await response.json();

      expect(prisma.vettingProcess.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
      expect(data.limit).toBe(10);
      expect(data.offset).toBe(20);
    });
  });

  describe('POST /api/tokens', () => {
    it('should return 401 if not authenticated', async () => {
      getSession.mockResolvedValue(null);

      const request = {
        url: 'http://localhost:3003/api/tokens',
        json: async () => ({}),
      };

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should return 400 if required fields missing', async () => {
      getSession.mockResolvedValue(mockSession);

      const request = {
        url: 'http://localhost:3003/api/tokens',
        json: async () => ({}),
      };

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Chain and contract address are required');
    });

    it('should return 400 for invalid address', async () => {
      getSession.mockResolvedValue(mockSession);
      isValidAddress.mockReturnValue(false);

      const request = {
        url: 'http://localhost:3003/api/tokens',
        json: async () => ({
          chain: 'SOLANA',
          contractAddress: 'invalid-address',
        }),
      };

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid contract address format');
    });

    it('should return 409 if token already exists', async () => {
      getSession.mockResolvedValue(mockSession);
      isValidAddress.mockReturnValue(true);
      prisma.token.findUnique.mockResolvedValue({
        ...mockToken,
        vettingProcess: mockVettingProcess,
      });

      const request = {
        url: 'http://localhost:3003/api/tokens',
        json: async () => ({
          chain: 'SOLANA',
          contractAddress: mockToken.contractAddress,
        }),
      };

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Token already submitted for vetting');
    });

    it('should create a new token', async () => {
      getSession.mockResolvedValue(mockSession);
      isValidAddress.mockReturnValue(true);
      prisma.token.findUnique.mockResolvedValue(null);
      prisma.token.upsert.mockResolvedValue(mockToken);
      prisma.vettingProcess.create.mockResolvedValue(mockVettingProcess);
      prisma.manualCheck.createMany.mockResolvedValue({ count: 2 });
      prisma.activity.create.mockResolvedValue({});

      const request = {
        url: 'http://localhost:3003/api/tokens',
        json: async () => ({
          chain: 'SOLANA',
          contractAddress: 'NewTokenAddress123',
          name: 'New Token',
          symbol: 'NEW',
        }),
      };

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBeDefined();
      expect(data.tokenId).toBeDefined();
    });
  });
});
