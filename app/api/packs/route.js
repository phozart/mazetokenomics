import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET /api/packs - Get user's packs
export async function GET(request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const packs = await prisma.pack.findMany({
      where: { userId: session.user.id },
      include: {
        tokens: {
          orderBy: { weight: 'desc' },
        },
        _count: {
          select: {
            purchases: true,
            dcaSchedules: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ packs });
  } catch (error) {
    console.error('Packs fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch packs' }, { status: 500 });
  }
}

// POST /api/packs - Create a new pack
export async function POST(request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, riskLevel, tokens } = body;

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Pack name is required' }, { status: 400 });
    }

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return NextResponse.json({ error: 'At least one token is required' }, { status: 400 });
    }

    // Validate weights sum to 100
    const totalWeight = tokens.reduce((sum, t) => sum + (t.weight || 0), 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      return NextResponse.json(
        { error: `Weights must sum to 100% (current: ${totalWeight.toFixed(2)}%)` },
        { status: 400 }
      );
    }

    // Validate each token has required fields
    for (const token of tokens) {
      if (!token.tokenAddress || !token.symbol) {
        return NextResponse.json(
          { error: 'Each token must have tokenAddress and symbol' },
          { status: 400 }
        );
      }
      if (token.weight <= 0 || token.weight > 100) {
        return NextResponse.json(
          { error: 'Token weight must be between 0 and 100' },
          { status: 400 }
        );
      }
    }

    // Create pack with tokens
    const pack = await prisma.pack.create({
      data: {
        userId: session.user.id,
        name: name.trim(),
        description: description?.trim() || null,
        riskLevel: riskLevel || 'medium',
        tokens: {
          create: tokens.map((t) => ({
            tokenAddress: t.tokenAddress,
            symbol: t.symbol,
            name: t.name || t.symbol,
            weight: t.weight,
            logoURI: t.logoURI || null,
            decimals: t.decimals || 9,
          })),
        },
      },
      include: {
        tokens: {
          orderBy: { weight: 'desc' },
        },
      },
    });

    return NextResponse.json({ success: true, pack });
  } catch (error) {
    console.error('Pack creation error:', error);
    return NextResponse.json({
      error: 'Failed to create pack',
      details: error.message,
    }, { status: 500 });
  }
}
