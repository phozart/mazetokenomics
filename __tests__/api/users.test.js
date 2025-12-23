/**
 * @jest-environment node
 */

// Mock Prisma - must be defined inside the mock factory
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
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
import { getSession } from '@/lib/auth';
import { GET, POST } from '@/app/api/users/route';

describe('/api/users', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default to admin session
    getSession.mockResolvedValue({
      user: {
        id: 'admin-user-id',
        email: 'admin@test.com',
        name: 'Admin',
        role: 'ADMIN',
      },
    });
  });

  describe('GET /api/users', () => {
    it('should return list of users for admin', async () => {
      const mockUsers = [
        { id: '1', email: 'user1', name: 'User 1', role: 'USER', isActive: true },
        { id: '2', email: 'user2', name: 'User 2', role: 'VIEWER', isActive: true },
      ];

      prisma.user.findMany.mockResolvedValue(mockUsers);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toEqual(mockUsers);
    });

    it('should return 403 for non-admin users', async () => {
      getSession.mockResolvedValueOnce({
        user: { id: 'user-id', role: 'USER' },
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return 401 for unauthenticated requests', async () => {
      getSession.mockResolvedValueOnce(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const newUser = {
        id: 'new-user-id',
        email: 'newuser',
        name: 'New User',
        role: 'USER',
        isActive: true,
      };

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(newUser);

      const request = new Request('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({
          username: 'newuser',
          name: 'New User',
          password: 'password123',
          confirmPassword: 'password123',
          role: 'USER',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user).toEqual(newUser);
    });

    it('should return 400 if passwords do not match', async () => {
      const request = new Request('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({
          username: 'newuser',
          name: 'New User',
          password: 'password123',
          confirmPassword: 'different',
          role: 'USER',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Passwords do not match');
    });

    it('should return 409 if username already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-id' });

      const request = new Request('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({
          username: 'existinguser',
          name: 'Existing User',
          password: 'password123',
          confirmPassword: 'password123',
          role: 'USER',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Username already exists');
    });
  });
});
