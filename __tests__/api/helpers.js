/**
 * Test utilities for API testing
 */

// Mock user for authenticated requests
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'USER',
};

export const mockAdminUser = {
  id: 'admin-user-id',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'ADMIN',
};

// Mock session
export const mockSession = {
  user: mockUser,
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

// Mock token data
export const mockToken = {
  id: 'token-id-1',
  contractAddress: 'BTr5SwWSKPBrdUzboi2SVr1QvSjmh1caCYUkxsxLpump',
  chain: 'SOLANA',
  symbol: 'WOLF',
  name: 'WOLF',
  decimals: 9,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock watchlist item
export const mockWatchlistItem = {
  id: 'watchlist-item-1',
  userId: mockUser.id,
  tokenId: mockToken.id,
  contractAddress: mockToken.contractAddress,
  chain: mockToken.chain,
  symbol: mockToken.symbol,
  name: mockToken.name,
  notes: null,
  sortOrder: 0,
  addedAt: new Date(),
  token: mockToken,
};

// Mock vetting process
export const mockVettingProcess = {
  id: 'vetting-id-1',
  tokenId: mockToken.id,
  status: 'COMPLETED',
  overallScore: 85,
  riskLevel: 'LOW',
  priority: 'NORMAL',
  createdAt: new Date(),
  updatedAt: new Date(),
  token: mockToken,
};

// Mock pack
export const mockPack = {
  id: 'pack-id-1',
  userId: mockUser.id,
  name: 'Test Pack',
  description: 'A test pack',
  riskLevel: 'medium',
  createdAt: new Date(),
  updatedAt: new Date(),
  tokens: [],
};

// Mock order
export const mockOrder = {
  id: 'order-id-1',
  userId: mockUser.id,
  tokenAddress: mockToken.contractAddress,
  symbol: mockToken.symbol,
  orderType: 'limit_buy',
  side: 'buy',
  amountSol: 1.0,
  triggerPrice: 0.001,
  status: 'active',
  createdAt: new Date(),
};

// Mock DCA schedule
export const mockDcaSchedule = {
  id: 'dca-id-1',
  userId: mockUser.id,
  name: 'Weekly SOL',
  tokenAddress: mockToken.contractAddress,
  symbol: mockToken.symbol,
  totalBudget: 10.0,
  amountPerPeriod: 1.0,
  frequency: 'weekly',
  nextExecution: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  executionsLeft: 10,
  executionsDone: 0,
  totalInvested: 0,
  status: 'active',
  createdAt: new Date(),
};

// Create a mock request
export function createMockRequest(method, url, body = null) {
  const request = {
    method,
    url: `http://localhost:3003${url}`,
    json: async () => body,
    headers: new Headers(),
  };
  return request;
}

// Create NextRequest mock
export function createNextRequest(method, url, body = null) {
  return {
    method,
    url: `http://localhost:3003${url}`,
    json: async () => body,
    headers: new Map(),
    nextUrl: new URL(`http://localhost:3003${url}`),
  };
}
