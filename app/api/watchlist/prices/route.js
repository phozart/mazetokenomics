import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getTokenPairs } from '@/lib/api/dexscreener';

// GET /api/watchlist/prices - Batch fetch live prices for all watchlist tokens
export async function GET(request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all watchlist items
    const watchlist = await prisma.watchlistItem.findMany({
      where: { userId: session.user.id },
      include: {
        token: {
          select: {
            contractAddress: true,
            chain: true,
          },
        },
      },
    });

    // Collect all addresses to fetch
    const addressMap = new Map(); // address -> watchlistItemId

    for (const item of watchlist) {
      const address = item.token?.contractAddress || item.contractAddress;
      if (address) {
        addressMap.set(address.toLowerCase(), item.id);
      }
    }

    // Fetch prices in parallel (with rate limiting consideration)
    const addresses = Array.from(addressMap.keys());
    const priceResults = {};

    // Batch in groups of 5 to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);

      const results = await Promise.all(
        batch.map(async (address) => {
          try {
            const dexData = await getTokenPairs(address);
            const pair = dexData?.pairs?.[0];

            return {
              address,
              data: pair ? {
                priceUsd: pair.priceUsd,
                priceChange24h: pair.priceChange?.h24 || 0,
                marketCap: pair.marketCap || pair.fdv,
                volume24h: pair.volume?.h24,
                liquidity: pair.liquidity?.usd,
                pairAddress: pair.pairAddress,
                dexId: pair.dexId,
              } : null,
            };
          } catch (error) {
            console.error(`Failed to fetch price for ${address}:`, error.message);
            return { address, data: null, error: error.message };
          }
        })
      );

      for (const result of results) {
        const itemId = addressMap.get(result.address);
        if (itemId) {
          priceResults[itemId] = result.data;
        }
      }

      // Small delay between batches to respect rate limits
      if (i + batchSize < addresses.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return NextResponse.json({
      prices: priceResults,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Prices fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
  }
}
