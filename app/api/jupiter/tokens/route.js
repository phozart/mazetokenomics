import { NextResponse } from 'next/server';

// Use Solana Labs token list as primary source (reliable CDN)
const TOKEN_LIST_URL = 'https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json';

// Cache token list in memory
let tokenCache = null;
let cacheTime = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * GET /api/jupiter/tokens
 * Get verified Solana token list
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    // Check cache
    const now = Date.now();
    if (!tokenCache || now - cacheTime > CACHE_DURATION) {
      const response = await fetch(TOKEN_LIST_URL, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch token list');
      }

      const data = await response.json();
      // Extract tokens array and filter for mainnet
      tokenCache = (data.tokens || []).filter(t =>
        t.chainId === 101 // Solana mainnet
      );
      cacheTime = now;
    }

    // If mints provided, fetch specific tokens
    const mints = searchParams.get('mints');
    if (mints) {
      const mintList = mints.split(',').map(m => m.toLowerCase());
      const matches = tokenCache.filter(t =>
        mintList.includes(t.address.toLowerCase())
      );
      return NextResponse.json({ tokens: matches });
    }

    // If query provided, filter tokens
    if (query) {
      const normalizedQuery = query.toLowerCase().trim();

      // Check if query is an address
      if (normalizedQuery.length >= 32) {
        const match = tokenCache.filter(t =>
          t.address.toLowerCase() === normalizedQuery
        );
        return NextResponse.json(match);
      }

      // Search by symbol or name
      const matches = tokenCache.filter(t =>
        t.symbol?.toLowerCase().includes(normalizedQuery) ||
        t.name?.toLowerCase().includes(normalizedQuery)
      ).slice(0, 20);

      return NextResponse.json(matches);
    }

    // Return top tokens (by some criteria or just first N)
    // For now, return first 100 which tends to be popular ones
    return NextResponse.json(tokenCache.slice(0, 100));
  } catch (error) {
    console.error('Tokens API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token list' },
      { status: 500 }
    );
  }
}
