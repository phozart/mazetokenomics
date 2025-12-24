import { NextResponse } from 'next/server';

const JUPITER_API_KEY = process.env.JUPITER_API_KEY;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids');

    if (!ids) {
      return NextResponse.json({ error: 'Missing ids parameter' }, { status: 400 });
    }

    // Use Jupiter API with API key if available, otherwise fallback to DexScreener
    let priceData = {};

    if (JUPITER_API_KEY) {
      // Jupiter API with authentication
      const response = await fetch(`https://api.jup.ag/price/v2?ids=${ids}`, {
        headers: {
          'Accept': 'application/json',
          'x-api-key': JUPITER_API_KEY,
        },
        next: { revalidate: 30 },
      });

      if (response.ok) {
        const data = await response.json();
        priceData = data.data || {};
      }
    } else {
      // Fallback to DexScreener (free, no auth)
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${ids}`, {
        next: { revalidate: 30 },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.pairs) {
          data.pairs.forEach(pair => {
            const mint = pair.baseToken?.address;
            if (mint && !priceData[mint]) {
              priceData[mint] = { price: parseFloat(pair.priceUsd || 0) };
            }
          });
        }
      }
    }

    return NextResponse.json({ data: priceData });
  } catch (error) {
    console.error('Error fetching token prices:', error);
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
  }
}
