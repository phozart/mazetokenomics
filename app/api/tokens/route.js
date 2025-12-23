import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isValidAddress, isSolanaAddress } from '@/lib/utils';
import { runAutomatedChecks } from '@/lib/vetting/automated-checks';
import { MANUAL_CHECK_CONFIG } from '@/lib/constants';

// GET /api/tokens - List all tokens
export async function GET(request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const chain = searchParams.get('chain');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where = {};

    if (status) {
      where.status = status;
    }

    if (chain) {
      where.token = { chain };
    }

    const [tokens, total] = await Promise.all([
      prisma.vettingProcess.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: {
          token: true,
          _count: {
            select: {
              automaticChecks: true,
              manualChecks: true,
              assignments: true,
            },
          },
        },
      }),
      prisma.vettingProcess.count({ where }),
    ]);

    return NextResponse.json({
      tokens,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching tokens:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    );
  }
}

// POST /api/tokens - Submit a new token for vetting
export async function POST(request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { chain, contractAddress, priority, notes, name, symbol } = body;

    // Validate required fields
    if (!chain || !contractAddress) {
      return NextResponse.json(
        { error: 'Chain and contract address are required' },
        { status: 400 }
      );
    }

    // Validate address format
    if (!isValidAddress(contractAddress, chain)) {
      return NextResponse.json(
        { error: 'Invalid contract address format' },
        { status: 400 }
      );
    }

    // Normalize address (lowercase for EVM, preserve case for Solana)
    const normalizedAddress = chain === 'SOLANA'
      ? contractAddress
      : contractAddress.toLowerCase();

    // Check if token already exists
    const existing = await prisma.token.findUnique({
      where: {
        contractAddress_chain: {
          contractAddress: normalizedAddress,
          chain,
        },
      },
      include: { vettingProcess: true },
    });

    if (existing?.vettingProcess) {
      return NextResponse.json(
        {
          error: 'Token already submitted for vetting',
          existingId: existing.vettingProcess.id,
        },
        { status: 409 }
      );
    }

    // Create token and vetting process
    const token = await prisma.token.upsert({
      where: {
        contractAddress_chain: {
          contractAddress: normalizedAddress,
          chain,
        },
      },
      create: {
        contractAddress: normalizedAddress,
        chain,
        name,
        symbol,
      },
      update: {
        name: name || undefined,
        symbol: symbol || undefined,
      },
    });

    // Create vetting process
    const vettingProcess = await prisma.vettingProcess.create({
      data: {
        tokenId: token.id,
        priority: priority || 'NORMAL',
        notes,
        status: 'PENDING',
      },
    });

    // Create initial manual checks (all pending)
    const manualChecksData = Object.entries(MANUAL_CHECK_CONFIG).map(
      ([checkType, config]) => ({
        vettingProcessId: vettingProcess.id,
        checkType,
        status: 'PENDING',
        severity: config.severity,
      })
    );

    await prisma.manualCheck.createMany({
      data: manualChecksData,
    });

    // Log activity
    await prisma.activity.create({
      data: {
        vettingProcessId: vettingProcess.id,
        userId: session.user.id,
        action: 'TOKEN_SUBMITTED',
        details: {
          chain,
          contractAddress: normalizedAddress,
          priority,
        },
      },
    });

    // Start automated checks in background (don't await)
    runAutomatedChecks(vettingProcess.id).catch((error) => {
      console.error('Automated checks failed:', error);
    });

    return NextResponse.json({
      id: vettingProcess.id,
      tokenId: token.id,
      status: vettingProcess.status,
      message: 'Token submitted successfully. Automated checks starting...',
    });
  } catch (error) {
    console.error('Error submitting token:', error);
    return NextResponse.json(
      { error: 'Failed to submit token', details: error.message },
      { status: 500 }
    );
  }
}
