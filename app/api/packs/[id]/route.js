import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET /api/packs/[id] - Get single pack
export async function GET(request, { params }) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const pack = await prisma.pack.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        tokens: {
          orderBy: { weight: 'desc' },
        },
        purchases: {
          include: {
            transactions: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        dcaSchedules: {
          where: { status: 'active' },
        },
      },
    });

    if (!pack) {
      return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
    }

    return NextResponse.json({ pack });
  } catch (error) {
    console.error('Pack fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch pack' }, { status: 500 });
  }
}

// PUT /api/packs/[id] - Update pack
export async function PUT(request, { params }) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, riskLevel, tokens } = body;

    // Verify pack belongs to user
    const existingPack = await prisma.pack.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existingPack) {
      return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
    }

    // Build update data
    const updateData = {};
    if (name?.trim()) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (riskLevel) updateData.riskLevel = riskLevel;

    // If tokens are being updated, validate and replace all
    if (tokens && Array.isArray(tokens)) {
      if (tokens.length === 0) {
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

      // Delete existing tokens and create new ones
      await prisma.packToken.deleteMany({ where: { packId: id } });

      updateData.tokens = {
        create: tokens.map((t) => ({
          tokenAddress: t.tokenAddress,
          symbol: t.symbol,
          name: t.name || t.symbol,
          weight: t.weight,
          logoURI: t.logoURI || null,
          decimals: t.decimals || 9,
        })),
      };
    }

    const pack = await prisma.pack.update({
      where: { id },
      data: updateData,
      include: {
        tokens: {
          orderBy: { weight: 'desc' },
        },
      },
    });

    return NextResponse.json({ success: true, pack });
  } catch (error) {
    console.error('Pack update error:', error);
    return NextResponse.json({
      error: 'Failed to update pack',
      details: error.message,
    }, { status: 500 });
  }
}

// DELETE /api/packs/[id] - Delete pack
export async function DELETE(request, { params }) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify pack belongs to user
    const pack = await prisma.pack.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!pack) {
      return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
    }

    // Check for active DCA schedules
    const activeDcaCount = await prisma.dcaSchedule.count({
      where: { packId: id, status: 'active' },
    });

    if (activeDcaCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete pack with active DCA schedules. Cancel them first.' },
        { status: 400 }
      );
    }

    // Delete pack (tokens will cascade delete)
    await prisma.pack.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Pack delete error:', error);
    return NextResponse.json({ error: 'Failed to delete pack' }, { status: 500 });
  }
}
