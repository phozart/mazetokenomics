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
                _count: {
                  select: {
                    redFlags: true,
                    greenFlags: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { addedAt: 'desc' }],
    });

    // For items without a linked token, try to find a matching token by contract address
    // This handles cases where a token was added to watchlist before being analyzed
    // Also fix lowercased Solana addresses by fetching correct case from DexScreener
    const enhancedWatchlist = await Promise.all(
      watchlist.map(async (item) => {
        let updatedItem = { ...item };

        // Fix lowercased Solana addresses
        if (item.chain === 'SOLANA' && item.contractAddress) {
          const isLikelyLowercased = item.contractAddress === item.contractAddress.toLowerCase() &&
            /[a-z]/.test(item.contractAddress);

          if (isLikelyLowercased) {
            try {
              const dexData = await getTokenPairs(item.contractAddress);
              const correctAddress = dexData?.pairs?.[0]?.baseToken?.address;

              if (correctAddress && correctAddress !== item.contractAddress) {
                // Update the watchlist item in the database
                await prisma.watchlistItem.update({
                  where: { id: item.id },
                  data: { contractAddress: correctAddress },
                });
                updatedItem.contractAddress = correctAddress;
                console.log(`[Watchlist] Fixed Solana address: ${item.contractAddress} -> ${correctAddress}`);
              }
            } catch (error) {
              console.error('Failed to fix Solana address:', error);
            }
          }
        }

        // If already has a linked token with vetting data, use it
        if (updatedItem.token?.vettingProcess) {
          return updatedItem;
        }

        // Try to find a token by contract address
        if (updatedItem.contractAddress && updatedItem.chain) {
          const matchingToken = await prisma.token.findFirst({
            where: {
              contractAddress: {
                equals: updatedItem.contractAddress,
                mode: 'insensitive', // Case-insensitive match for addresses
              },
              chain: updatedItem.chain,
            },
            include: {
              vettingProcess: {
                select: {
                  id: true,
                  overallScore: true,
                  riskLevel: true,
                  status: true,
                  _count: {
                    select: {
                      redFlags: true,
                      greenFlags: true,
                    },
                  },
                },
              },
            },
          });

          if (matchingToken) {
            return { ...updatedItem, token: matchingToken };
          }
        }

        return updatedItem;
      })
    );

    // If prices requested, fetch live data from DexScreener
    if (includePrices) {
      const itemsWithPrices = await Promise.all(
        enhancedWatchlist.map(async (item) => {
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

    return NextResponse.json({ watchlist: enhancedWatchlist });
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
    // Note: Solana addresses are Base58 (case-sensitive), EVM addresses are hex (case-insensitive)
    const normalizedAddress = chain === 'SOLANA' ? contractAddress : contractAddress?.toLowerCase();

    let existing = null;
    if (tokenId) {
      existing = await prisma.watchlistItem.findFirst({
        where: { userId: session.user.id, tokenId },
      });
    } else if (contractAddress && chain) {
      existing = await prisma.watchlistItem.findFirst({
        where: {
          userId: session.user.id,
          contractAddress: normalizedAddress,
          chain,
        },
      });
    }

    if (existing) {
      return NextResponse.json({ error: 'Already in watchlist' }, { status: 409 });
    }

    // If tokenId provided, verify it exists
    let linkedToken = null;
    if (tokenId) {
      linkedToken = await prisma.token.findUnique({ where: { id: tokenId } });
      if (!linkedToken) {
        return NextResponse.json({ error: 'Token not found' }, { status: 404 });
      }
    }

    // Fetch token info from DexScreener if needed
    let dexPair = null;
    if (contractAddress) {
      try {
        console.log('Fetching token info from DexScreener for:', contractAddress);
        const dexData = await getTokenPairs(contractAddress);
        dexPair = dexData?.pairs?.[0];

        if (dexPair) {
          const tokenInfo = dexPair.baseToken;
          if (tokenInfo) {
            if (!symbol && tokenInfo.symbol) symbol = tokenInfo.symbol;
            if (!name && tokenInfo.name) name = tokenInfo.name;
            // Get correct address format from DexScreener
            if (tokenInfo.address) {
              contractAddress = tokenInfo.address;
            }
          }
          console.log('Extracted token info:', { symbol, name, contractAddress });
        }
      } catch (error) {
        console.error('Failed to fetch token info from DexScreener:', error);
      }
    }

    // If no tokenId, try to find or create a Token record
    if (!tokenId && contractAddress && chain) {
      // First, try to find existing token
      linkedToken = await prisma.token.findFirst({
        where: {
          contractAddress: {
            equals: contractAddress,
            mode: 'insensitive',
          },
          chain,
        },
      });

      // If no existing token, create one
      if (!linkedToken) {
        try {
          linkedToken = await prisma.token.create({
            data: {
              contractAddress: contractAddress,
              chain,
              symbol: symbol || 'UNKNOWN',
              name: name || 'Unknown Token',
              decimals: dexPair?.baseToken?.decimals || 18,
              totalSupply: dexPair?.baseToken?.totalSupply || null,
            },
          });
          console.log('Created new Token record:', linkedToken.id);
        } catch (error) {
          // Token might have been created by another request, try to find it again
          console.log('Failed to create token, trying to find existing:', error.message);
          linkedToken = await prisma.token.findFirst({
            where: {
              contractAddress: {
                equals: contractAddress,
                mode: 'insensitive',
              },
              chain,
            },
          });
        }
      }
    }

    // Re-normalize address after potential update from DexScreener
    const finalAddress = chain === 'SOLANA' ? contractAddress : contractAddress?.toLowerCase();

    // Build the data object
    const createData = {
      userId: session.user.id,
      tokenId: linkedToken?.id || null,
      contractAddress: finalAddress,
      chain,
      symbol: symbol || null,
      name: name || null,
      notes: notes || null,
    };

    console.log('Creating watchlist item:', createData);

    // Create watchlist item
    const watchlistItem = await prisma.watchlistItem.create({
      data: createData,
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

// PATCH /api/watchlist - Reorder watchlist items
export async function PATCH(request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json({ error: 'orderedIds must be an array' }, { status: 400 });
    }

    // Update the sortOrder for each item
    await Promise.all(
      orderedIds.map((id, index) =>
        prisma.watchlistItem.updateMany({
          where: {
            id,
            userId: session.user.id, // Ensure user owns the item
          },
          data: { sortOrder: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Watchlist reorder error:', error);
    return NextResponse.json({ error: 'Failed to reorder watchlist' }, { status: 500 });
  }
}
