import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getTokenPairs } from '@/lib/api/dexscreener';

// POST /api/prices/collect - Collect price snapshots for all watchlisted tokens
export async function POST(request) {
  try {
    // Get all unique contract addresses from watchlist
    const watchlistItems = await prisma.watchlistItem.findMany({
      select: {
        contractAddress: true,
        chain: true,
        token: {
          select: {
            contractAddress: true,
            chain: true,
          },
        },
      },
    });

    // Build unique address/chain pairs
    const addressMap = new Map();
    for (const item of watchlistItems) {
      const address = item.token?.contractAddress || item.contractAddress;
      const chain = item.token?.chain || item.chain;
      if (address && chain) {
        const key = `${address.toLowerCase()}-${chain}`;
        if (!addressMap.has(key)) {
          addressMap.set(key, { address, chain });
        }
      }
    }

    const tokens = Array.from(addressMap.values());
    const results = { collected: 0, skipped: 0, errors: [] };

    // Check for recent snapshots (within last hour) to avoid duplicates
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Process in batches of 5 to respect rate limits
    const batchSize = 5;
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async ({ address, chain }) => {
          try {
            // Check if we already have a recent snapshot
            const recentSnapshot = await prisma.priceSnapshot.findFirst({
              where: {
                contractAddress: address,
                chain: chain,
                timestamp: { gte: oneHourAgo },
              },
              orderBy: { timestamp: 'desc' },
            });

            if (recentSnapshot) {
              results.skipped++;
              return;
            }

            // Fetch current price from DexScreener
            const dexData = await getTokenPairs(address);

            // Filter to pairs where token is the base token
            const relevantPairs = dexData?.pairs?.filter(
              (p) => p.baseToken?.address?.toLowerCase() === address.toLowerCase()
            ) || [];

            // Get the main pair (highest liquidity)
            const pair = relevantPairs.sort(
              (a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
            )[0] || dexData?.pairs?.[0];

            if (!pair) {
              results.errors.push({ address, error: 'No pair data found' });
              return;
            }

            // Calculate total liquidity across relevant pairs
            const totalLiquidity = relevantPairs.reduce(
              (sum, p) => sum + (parseFloat(p.liquidity?.usd) || 0),
              0
            );

            // Store snapshot
            await prisma.priceSnapshot.create({
              data: {
                contractAddress: address,
                chain: chain,
                priceUsd: parseFloat(pair.priceUsd) || 0,
                marketCap: pair.marketCap || pair.fdv || null,
                volume24h: pair.volume?.h24 || null,
                liquidity: totalLiquidity || pair.liquidity?.usd || null,
                priceChange24h: pair.priceChange?.h24 || null,
              },
            });

            results.collected++;
          } catch (error) {
            console.error(`Failed to collect price for ${address}:`, error.message);
            results.errors.push({ address, error: error.message });
          }
        })
      );

      // Small delay between batches
      if (i + batchSize < tokens.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    // Cleanup old snapshots (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const deleted = await prisma.priceSnapshot.deleteMany({
      where: {
        timestamp: { lt: thirtyDaysAgo },
      },
    });

    return NextResponse.json({
      success: true,
      ...results,
      totalTokens: tokens.length,
      cleanedUp: deleted.count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Price collection error:', error);
    return NextResponse.json({ error: 'Failed to collect prices' }, { status: 500 });
  }
}
