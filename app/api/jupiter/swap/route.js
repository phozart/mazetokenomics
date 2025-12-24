import { NextResponse } from 'next/server';

// Jupiter public API - no auth required
const JUPITER_API_URL = 'https://public.jupiterapi.com';

/**
 * POST /api/jupiter/swap
 * Get a swap transaction from Jupiter
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { quoteResponse, userPublicKey } = body;

    if (!quoteResponse || !userPublicKey) {
      return NextResponse.json(
        { error: 'Missing required parameters: quoteResponse, userPublicKey' },
        { status: 400 }
      );
    }

    // Validate public key format (basic check)
    if (typeof userPublicKey !== 'string' || userPublicKey.length < 32 || userPublicKey.length > 44) {
      return NextResponse.json(
        { error: 'Invalid public key format' },
        { status: 400 }
      );
    }

    const response = await fetch(`${JUPITER_API_URL}/swap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        // Auto-calculate priority fee
        prioritizationFeeLamports: 'auto',
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.error('Jupiter swap error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create swap transaction' },
        { status: response.status }
      );
    }

    const swapData = await response.json();
    return NextResponse.json(swapData);
  } catch (error) {
    console.error('Swap API error:', error);
    return NextResponse.json(
      { error: 'Failed to create swap transaction' },
      { status: 500 }
    );
  }
}
