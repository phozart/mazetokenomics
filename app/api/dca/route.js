import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// Calculate next execution date based on frequency
function calculateNextExecution(frequency, startDate = new Date()) {
  const next = new Date(startDate);

  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      next.setDate(next.getDate() + 7);
  }

  return next;
}

// GET /api/dca - Get user's DCA schedules
export async function GET(request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where = { userId: session.user.id };
    if (status) where.status = status;

    const schedules = await prisma.dcaSchedule.findMany({
      where,
      include: {
        pack: {
          include: {
            tokens: true,
          },
        },
        executions: {
          orderBy: { executedAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ schedules });
  } catch (error) {
    console.error('DCA fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch DCA schedules' }, { status: 500 });
  }
}

// POST /api/dca - Create a new DCA schedule
export async function POST(request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      packId,
      tokenAddress,
      symbol,
      totalBudget,
      amountPerPeriod,
      frequency,
      startDate,
      jupiterDcaPubkey, // Jupiter DCA account pubkey
      txSignature,      // Creation transaction signature
    } = body;

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Schedule name is required' }, { status: 400 });
    }

    if (!packId && !tokenAddress) {
      return NextResponse.json(
        { error: 'Must specify either a pack or a token' },
        { status: 400 }
      );
    }

    if (!totalBudget || totalBudget <= 0) {
      return NextResponse.json({ error: 'Total budget must be positive' }, { status: 400 });
    }

    if (!amountPerPeriod || amountPerPeriod <= 0) {
      return NextResponse.json({ error: 'Amount per period must be positive' }, { status: 400 });
    }

    if (amountPerPeriod > totalBudget) {
      return NextResponse.json(
        { error: 'Amount per period cannot exceed total budget' },
        { status: 400 }
      );
    }

    const validFrequencies = ['daily', 'weekly', 'biweekly', 'monthly'];
    if (!frequency || !validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: `Frequency must be one of: ${validFrequencies.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify pack belongs to user if specified
    if (packId) {
      const pack = await prisma.pack.findFirst({
        where: { id: packId, userId: session.user.id },
      });
      if (!pack) {
        return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
      }
    }

    // Calculate number of executions
    const executionsLeft = Math.ceil(totalBudget / amountPerPeriod);

    // Calculate first execution date
    const firstExecution = startDate
      ? new Date(startDate)
      : calculateNextExecution(frequency);

    const schedule = await prisma.dcaSchedule.create({
      data: {
        userId: session.user.id,
        name: name.trim(),
        packId: packId || null,
        tokenAddress: tokenAddress || null,
        symbol: symbol || null,
        totalBudget,
        amountPerPeriod,
        frequency,
        nextExecution: firstExecution,
        executionsLeft,
        status: 'active',
        jupiterDcaPubkey: jupiterDcaPubkey || null,
        txSignature: txSignature || null,
      },
      include: {
        pack: {
          include: { tokens: true },
        },
      },
    });

    return NextResponse.json({ success: true, schedule });
  } catch (error) {
    console.error('DCA creation error:', error);
    return NextResponse.json({
      error: 'Failed to create DCA schedule',
      details: error.message,
    }, { status: 500 });
  }
}
