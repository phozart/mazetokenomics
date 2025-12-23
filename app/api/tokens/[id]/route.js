import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET /api/tokens/[id] - Get token details
export async function GET(request, { params }) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const vettingProcess = await prisma.vettingProcess.findUnique({
      where: { id },
      include: {
        token: true,
        automaticChecks: {
          orderBy: { createdAt: 'asc' },
        },
        manualChecks: {
          include: {
            reviewer: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        redFlags: {
          orderBy: { createdAt: 'desc' },
        },
        greenFlags: {
          orderBy: { createdAt: 'desc' },
        },
        activities: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!vettingProcess) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    return NextResponse.json(vettingProcess);
  } catch (error) {
    console.error('Error fetching token:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token' },
      { status: 500 }
    );
  }
}

// PATCH /api/tokens/[id] - Update token/vetting process
export async function PATCH(request, { params }) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { status, priority, notes } = body;

    const updateData = {};

    if (status) {
      updateData.status = status;

      // Update timestamps based on status
      if (status === 'APPROVED' || status === 'REJECTED') {
        updateData.completedAt = new Date();
      }
    }

    if (priority) {
      updateData.priority = priority;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const vettingProcess = await prisma.vettingProcess.update({
      where: { id },
      data: updateData,
    });

    // Log activity
    await prisma.activity.create({
      data: {
        vettingProcessId: id,
        userId: session.user.id,
        action: 'VETTING_UPDATED',
        details: updateData,
      },
    });

    return NextResponse.json(vettingProcess);
  } catch (error) {
    console.error('Error updating token:', error);
    return NextResponse.json(
      { error: 'Failed to update token' },
      { status: 500 }
    );
  }
}

// DELETE /api/tokens/[id] - Delete token and all related data
export async function DELETE(request, { params }) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins and users can delete tokens (not viewers)
  if (session.user.role === 'VIEWER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;

    // Get the vetting process to find the token
    const vettingProcess = await prisma.vettingProcess.findUnique({
      where: { id },
      include: { token: true },
    });

    if (!vettingProcess) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    // Delete the token (cascades to vettingProcess and all related records)
    await prisma.token.delete({
      where: { id: vettingProcess.token.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting token:', error);
    return NextResponse.json(
      { error: 'Failed to delete token' },
      { status: 500 }
    );
  }
}
