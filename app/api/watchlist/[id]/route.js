import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// DELETE /api/watchlist/[id] - Remove from watchlist
export async function DELETE(request, { params }) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Find the watchlist item
    const item = await prisma.watchlistItem.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Verify ownership
    if (item.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.watchlistItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Watchlist delete error:', error);
    return NextResponse.json({ error: 'Failed to remove from watchlist' }, { status: 500 });
  }
}

// PATCH /api/watchlist/[id] - Update notes
export async function PATCH(request, { params }) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { notes } = body;

    // Find the watchlist item
    const item = await prisma.watchlistItem.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Verify ownership
    if (item.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.watchlistItem.update({
      where: { id },
      data: { notes },
    });

    return NextResponse.json({ success: true, watchlistItem: updated });
  } catch (error) {
    console.error('Watchlist update error:', error);
    return NextResponse.json({ error: 'Failed to update watchlist item' }, { status: 500 });
  }
}
