/**
 * @jest-environment node
 */

// Mock Prisma - must be defined inside the mock factory
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
  hashPassword: jest.fn((password) => Promise.resolve(`hashed_${password}`)),
  verifyPassword: jest.fn((plain, hashed) => Promise.resolve(hashed === `hashed_${plain}`)),
}));

import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { GET } from '@/app/api/account/me/route';
import { POST } from '@/app/api/account/password/route';

describe('/api/account', () => {
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

  describe('GET /api/account/me', () => {
    it('should return current user info', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toEqual({
        id: 'test-user-id',
        email: 'test@test.com',
        name: 'Test User',
        role: 'USER',
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      getSession.mockResolvedValueOnce(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('POST /api/account/password', () => {
    it('should change password successfully', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'test-user-id',
        password: 'hashed_oldpassword',
      });
      prisma.user.update.mockResolvedValue({ id: 'test-user-id' });

      const request = new Request('http://localhost/api/account/password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: 'oldpassword',
          newPassword: 'newpassword',
          confirmPassword: 'newpassword',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Password changed successfully');
    });

    it('should return 400 if passwords do not match', async () => {
      const request = new Request('http://localhost/api/account/password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: 'oldpassword',
          newPassword: 'newpassword',
          confirmPassword: 'different',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('New passwords do not match');
    });

    it('should return 400 if current password is incorrect', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'test-user-id',
        password: 'hashed_correctpassword',
      });

      const request = new Request('http://localhost/api/account/password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword',
          confirmPassword: 'newpassword',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Current password is incorrect');
    });

    it('should return 400 if password too short', async () => {
      const request = new Request('http://localhost/api/account/password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: 'oldpassword',
          newPassword: '123',
          confirmPassword: '123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Password must be at least 4 characters');
    });
  });
});
