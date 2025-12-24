import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET /api/dca/[id] - Get single DCA schedule
export async function GET(request, { params }) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const schedule = await prisma.dcaSchedule.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        pack: {
          include: { tokens: true },
        },
        executions: {
          orderBy: { executedAt: 'desc' },
        },
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: 'DCA schedule not found' }, { status: 404 });
    }

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error('DCA fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch DCA schedule' }, { status: 500 });
  }
}

// PUT /api/dca/[id] - Update DCA schedule (pause/resume)
export async function PUT(request, { params }) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, amountPerPeriod, frequency } = body;

    // Verify schedule belongs to user
    const existingSchedule = await prisma.dcaSchedule.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existingSchedule) {
      return NextResponse.json({ error: 'DCA schedule not found' }, { status: 404 });
    }

    // Can only modify active or paused schedules
    if (!['active', 'paused'].includes(existingSchedule.status)) {
      return NextResponse.json(
        { error: 'Cannot modify completed or cancelled schedules' },
        { status: 400 }
      );
    }

    const updateData = {};

    // Handle status changes
    if (status) {
      if (status === 'paused' && existingSchedule.status === 'active') {
        updateData.status = 'paused';
      } else if (status === 'active' && existingSchedule.status === 'paused') {
        updateData.status = 'active';
        // Recalculate next execution from now
        const now = new Date();
        const freq = frequency || existingSchedule.frequency;
        const next = new Date(now);

        switch (freq) {
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
        }

        updateData.nextExecution = next;
      }
    }

    // Update other fields if provided
    if (amountPerPeriod && amountPerPeriod > 0) {
      updateData.amountPerPeriod = amountPerPeriod;
      // Recalculate remaining executions
      const remaining = existingSchedule.totalBudget - existingSchedule.totalInvested;
      updateData.executionsLeft = Math.ceil(remaining / amountPerPeriod);
    }

    if (frequency && ['daily', 'weekly', 'biweekly', 'monthly'].includes(frequency)) {
      updateData.frequency = frequency;
    }

    const schedule = await prisma.dcaSchedule.update({
      where: { id },
      data: updateData,
      include: {
        pack: {
          include: { tokens: true },
        },
        executions: {
          orderBy: { executedAt: 'desc' },
          take: 5,
        },
      },
    });

    return NextResponse.json({ success: true, schedule });
  } catch (error) {
    console.error('DCA update error:', error);
    return NextResponse.json({
      error: 'Failed to update DCA schedule',
      details: error.message,
    }, { status: 500 });
  }
}

// DELETE /api/dca/[id] - Cancel DCA schedule
export async function DELETE(request, { params }) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify schedule belongs to user
    const schedule = await prisma.dcaSchedule.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!schedule) {
      return NextResponse.json({ error: 'DCA schedule not found' }, { status: 404 });
    }

    // Update status to cancelled instead of deleting
    await prisma.dcaSchedule.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DCA delete error:', error);
    return NextResponse.json({ error: 'Failed to cancel DCA schedule' }, { status: 500 });
  }
}
