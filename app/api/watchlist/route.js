import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getTokenPairs } from '@/lib/api/dexscreener';

// GET /api/watchlist - Get user's watchlist with optional live prices
export async function GET(request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includePrices = searchParams.get('prices') === 'true';

    const watchlist = await prisma.watchlistItem.findMany({
      where: { userId: session.user.id },
      include: {
        token: {
          include: {
            vettingProcess: {
              select: {
                id: true,
                overallScore: true,
                riskLevel: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: { addedAt: 'desc' },
    });

    // If prices requested, fetch live data from DexScreener
    if (includePrices) {
      const itemsWithPrices = await Promise.all(
        watchlist.map(async (item) => {
          const address = item.token?.contractAddress || item.contractAddress;
          if (!address) return { ...item, priceData: null };

          try {
            const dexData = await getTokenPairs(address);
            const pair = dexData?.pairs?.[0];

            return {
              ...item,
              priceData: pair ? {
                priceUsd: pair.priceUsd,
                priceChange24h: pair.priceChange?.h24 || 0,
                marketCap: pair.marketCap || pair.fdv,
                volume24h: pair.volume?.h24,
                liquidity: pair.liquidity?.usd,
              } : null,
            };
          } catch (error) {
            console.error(`Failed to fetch price for ${address}:`, error);
            return { ...item, priceData: null };
          }
        })
      );

      return NextResponse.json({ watchlist: itemsWithPrices });
    }

    return NextResponse.json({ watchlist });
  } catch (error) {
    console.error('Watchlist fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch watchlist' }, { status: 500 });
  }
}

// POST /api/watchlist - Add token to watchlist
export async function POST(request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    let { tokenId, contractAddress, chain, symbol, name, notes } = body;

    console.log('Watchlist add request:', { tokenId, contractAddress, chain, symbol, userId: session.user.id });

    // Validate - must have either tokenId or (contractAddress + chain)
    if (!tokenId && (!contractAddress || !chain)) {
      return NextResponse.json(
        { error: 'Must provide either tokenId or contractAddress with chain' },
        { status: 400 }
      );
    }

    // Check if already in watchlist
    let existing = null;
    if (tokenId) {
      existing = await prisma.watchlistItem.findFirst({
        where: { userId: session.user.id, tokenId },
      });
    } else if (contractAddress && chain) {
      existing = await prisma.watchlistItem.findFirst({
        where: {
          userId: session.user.id,
          contractAddress: contractAddress.toLowerCase(),
          chain,
        },
      });
    }

    if (existing) {
      return NextResponse.json({ error: 'Already in watchlist' }, { status: 409 });
    }

    // If tokenId provided, verify it exists
    if (tokenId) {
      const token = await prisma.token.findUnique({ where: { id: tokenId } });
      if (!token) {
        return NextResponse.json({ error: 'Token not found' }, { status: 404 });
      }
    }

    // If no symbol/name provided and we have a contract address, fetch from DexScreener
    if (contractAddress && (!symbol || !name)) {
      try {
        console.log('Fetching token info from DexScreener for:', contractAddress);
        const dexData = await getTokenPairs(contractAddress);
        const pair = dexData?.pairs?.[0];

        if (pair) {
          // Get token info from the base token in the pair
          const tokenInfo = pair.baseToken;
          if (tokenInfo) {
            if (!symbol && tokenInfo.symbol) {
              symbol = tokenInfo.symbol;
            }
            if (!name && tokenInfo.name) {
              name = tokenInfo.name;
            }
            console.log('Extracted token info:', { symbol, name });
          }
        }
      } catch (error) {
        console.error('Failed to fetch token info from DexScreener:', error);
        // Continue without the info - not a fatal error
      }
    }

    // Build the data object - only include fields that have values
    const createData = {
      userId: session.user.id,
    };

    if (tokenId) {
      createData.tokenId = tokenId;
    }
    if (contractAddress) {
      createData.contractAddress = contractAddress.toLowerCase();
    }
    if (chain) {
      createData.chain = chain;
    }
    if (symbol) {
      createData.symbol = symbol;
    }
    if (name) {
      createData.name = name;
    }
    if (notes) {
      createData.notes = notes;
    }

    console.log('Creating watchlist item:', createData);

    // Create watchlist item
    const watchlistItem = await prisma.watchlistItem.create({
      data: createData,
      include: {
        token: true,
      },
    });

    return NextResponse.json({ success: true, watchlistItem });
  } catch (error) {
    console.error('Watchlist add error:', error);
    return NextResponse.json({
      error: 'Failed to add to watchlist',
      details: error.message
    }, { status: 500 });
  }
}
