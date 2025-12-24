import { NextResponse } from 'next/server';

// Jupiter public API - no auth required
const JUPITER_API_URL = 'https://public.jupiterapi.com';

/**
 * GET /api/jupiter/quote
 * Proxy for Jupiter quote API
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const inputMint = searchParams.get('inputMint');
    const outputMint = searchParams.get('outputMint');
    const amount = searchParams.get('amount');
    const slippageBps = searchParams.get('slippageBps') || '100';

    if (!inputMint || !outputMint || !amount) {
      return NextResponse.json(
        { error: 'Missing required parameters: inputMint, outputMint, amount' },
        { status: 400 }
      );
    }

    // Validate amount is a positive number
    if (isNaN(amount) || parseInt(amount) <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount,
      slippageBps,
      dynamicComputeUnitLimit: 'true',
      onlyDirectRoutes: 'false',
    });

    const response = await fetch(`${JUPITER_API_URL}/quote?${params}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.error('Jupiter quote error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to get quote from Jupiter' },
        { status: response.status }
      );
    }

    const quote = await response.json();
    return NextResponse.json(quote);
  } catch (error) {
    console.error('Quote API error:', error);

    // Check for network/DNS errors
    if (error.cause?.code === 'ENOTFOUND') {
      return NextResponse.json(
        { error: 'Cannot reach Jupiter API. Check your network connection.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch quote. Please try again.' },
      { status: 500 }
    );
  }
}
