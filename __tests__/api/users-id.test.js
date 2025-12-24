/**
 * @jest-environment node
 */

/**
 * Users [id] API Tests
 */

import { mockAdminUser } from './helpers';

const mockAdminSession = {
  user: mockAdminUser,
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

const mockNonAdminSession = {
  user: { id: 'user-id', email: 'user@test.com', name: 'User', role: 'USER' },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
  hashPassword: jest.fn((password) => Promise.resolve(`hashed_${password}`)),
}));

import prisma from '@/lib/prisma';
import { GET, PATCH, DELETE } from '@/app/api/users/[id]/route';
import { getSession } from '@/lib/auth';

describe('Users [id] API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/users/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      getSession.mockResolvedValue(null);

      const request = { url: 'http://localhost:3003/api/users/123' };
      const response = await GET(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 for non-admin users', async () => {
      getSession.mockResolvedValue(mockNonAdminSession);

      const request = { url: 'http://localhost:3003/api/users/123' };
      const response = await GET(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return 404 if user not found', async () => {
      getSession.mockResolvedValue(mockAdminSession);
      prisma.user.findUnique.mockResolvedValue(null);

      const request = { url: 'http://localhost:3003/api/users/123' };
      const response = await GET(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return user for admin', async () => {
      getSession.mockResolvedValue(mockAdminSession);
      prisma.user.findUnique.mockResolvedValue({
        id: '123',
        email: 'test@test.com',
        name: 'Test',
        role: 'USER',
        isActive: true,
      });

      const request = { url: 'http://localhost:3003/api/users/123' };
      const response = await GET(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
    });
  });

  describe('PATCH /api/users/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      getSession.mockResolvedValue(null);

      const request = {
        url: 'http://localhost:3003/api/users/123',
        json: async () => ({}),
      };
      const response = await PATCH(request, { params: Promise.resolve({ id: '123' }) });

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-admin users', async () => {
      getSession.mockResolvedValue(mockNonAdminSession);

      const request = {
        url: 'http://localhost:3003/api/users/123',
        json: async () => ({ name: 'New Name' }),
      };
      const response = await PATCH(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return 404 if user not found', async () => {
      getSession.mockResolvedValue(mockAdminSession);
      prisma.user.findUnique.mockResolvedValue(null);

      const request = {
        url: 'http://localhost:3003/api/users/123',
        json: async () => ({ name: 'New Name' }),
      };
      const response = await PATCH(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should update user name', async () => {
      getSession.mockResolvedValue(mockAdminSession);
      prisma.user.findUnique.mockResolvedValue({ id: '123', name: 'Old Name' });
      prisma.user.update.mockResolvedValue({ id: '123', name: 'New Name' });

      const request = {
        url: 'http://localhost:3003/api/users/123',
        json: async () => ({ name: 'New Name' }),
      };
      const response = await PATCH(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should prevent admin from deactivating themselves', async () => {
      getSession.mockResolvedValue(mockAdminSession);
      prisma.user.findUnique.mockResolvedValue({ id: mockAdminUser.id });

      const request = {
        url: `http://localhost:3003/api/users/${mockAdminUser.id}`,
        json: async () => ({ isActive: false }),
      };
      const response = await PATCH(request, { params: Promise.resolve({ id: mockAdminUser.id }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cannot deactivate your own account');
    });

    it('should prevent admin from demoting themselves', async () => {
      getSession.mockResolvedValue(mockAdminSession);
      prisma.user.findUnique.mockResolvedValue({ id: mockAdminUser.id });

      const request = {
        url: `http://localhost:3003/api/users/${mockAdminUser.id}`,
        json: async () => ({ role: 'USER' }),
      };
      const response = await PATCH(request, { params: Promise.resolve({ id: mockAdminUser.id }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cannot change your own role');
    });

    it('should return 400 for invalid role', async () => {
      getSession.mockResolvedValue(mockAdminSession);
      prisma.user.findUnique.mockResolvedValue({ id: '123' });

      const request = {
        url: 'http://localhost:3003/api/users/123',
        json: async () => ({ role: 'INVALID' }),
      };
      const response = await PATCH(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid role');
    });

    it('should return 400 if passwords do not match', async () => {
      getSession.mockResolvedValue(mockAdminSession);
      prisma.user.findUnique.mockResolvedValue({ id: '123' });

      const request = {
        url: 'http://localhost:3003/api/users/123',
        json: async () => ({ password: 'newpass', confirmPassword: 'different' }),
      };
      const response = await PATCH(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Passwords do not match');
    });
  });

  describe('DELETE /api/users/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      getSession.mockResolvedValue(null);

      const request = { url: 'http://localhost:3003/api/users/123' };
      const response = await DELETE(request, { params: Promise.resolve({ id: '123' }) });

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-admin users', async () => {
      getSession.mockResolvedValue(mockNonAdminSession);

      const request = { url: 'http://localhost:3003/api/users/123' };
      const response = await DELETE(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should prevent admin from deleting themselves', async () => {
      getSession.mockResolvedValue(mockAdminSession);

      const request = { url: `http://localhost:3003/api/users/${mockAdminUser.id}` };
      const response = await DELETE(request, { params: Promise.resolve({ id: mockAdminUser.id }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cannot delete your own account');
    });

    it('should return 404 if user not found', async () => {
      getSession.mockResolvedValue(mockAdminSession);
      prisma.user.findUnique.mockResolvedValue(null);

      const request = { url: 'http://localhost:3003/api/users/123' };
      const response = await DELETE(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should delete user successfully', async () => {
      getSession.mockResolvedValue(mockAdminSession);
      prisma.user.findUnique.mockResolvedValue({ id: '123' });
      prisma.user.delete.mockResolvedValue({ id: '123' });

      const request = { url: 'http://localhost:3003/api/users/123' };
      const response = await DELETE(request, { params: Promise.resolve({ id: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
