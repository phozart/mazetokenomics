import { NextResponse } from 'next/server';

/**
 * GET /api/tokens/metadata
 * Fetch token metadata from multiple sources
 *
 * Query params:
 * - mints: Comma-separated list of token mint addresses
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const mints = searchParams.get('mints');

    if (!mints) {
      return NextResponse.json({ error: 'Missing mints parameter' }, { status: 400 });
    }

    const mintList = mints.split(',').filter(m => m.length > 30);

    if (mintList.length === 0) {
      return NextResponse.json({ tokens: {} });
    }

    const tokenMetadata = {};

    // Try to fetch from DexScreener for each token (in batches)
    const BATCH_SIZE = 5;

    for (let i = 0; i < mintList.length; i += BATCH_SIZE) {
      const batch = mintList.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (mint) => {
        try {
          // DexScreener API returns pairs with token info
          const response = await fetch(
            `https://api.dexscreener.com/latest/dex/tokens/${mint}`,
            {
              headers: { 'Accept': 'application/json' },
              next: { revalidate: 300 }, // Cache for 5 minutes
            }
          );

          if (!response.ok) return { mint, data: null };

          const data = await response.json();

          if (data.pairs && data.pairs.length > 0) {
            // Find the pair where this token is the base token
            const pair = data.pairs.find(p =>
              p.baseToken?.address?.toLowerCase() === mint.toLowerCase()
            ) || data.pairs[0];

            const tokenInfo = pair.baseToken?.address?.toLowerCase() === mint.toLowerCase()
              ? pair.baseToken
              : pair.quoteToken;

            return {
              mint,
              data: {
                address: mint,
                symbol: tokenInfo?.symbol || 'Unknown',
                name: tokenInfo?.name || 'Unknown Token',
                logoURI: pair.info?.imageUrl || null,
                priceUsd: parseFloat(pair.priceUsd) || 0,
              },
            };
          }

          return { mint, data: null };
        } catch (error) {
          console.error(`Failed to fetch metadata for ${mint}:`, error);
          return { mint, data: null };
        }
      });

      const results = await Promise.all(batchPromises);

      for (const result of results) {
        if (result.data) {
          tokenMetadata[result.mint] = result.data;
        }
      }

      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < mintList.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return NextResponse.json({ tokens: tokenMetadata });
  } catch (error) {
    console.error('Token metadata API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token metadata' },
      { status: 500 }
    );
  }
}
