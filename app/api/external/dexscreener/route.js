import { NextResponse } from 'next/server';
import { getTokenPairs } from '@/lib/api/dexscreener';

// GET /api/external/dexscreener - Proxy to DEXScreener API
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    const data = await getTokenPairs(address);
    return NextResponse.json(data);
  } catch (error) {
    console.error('DEXScreener API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from DEXScreener' },
      { status: 500 }
    );
  }
}
