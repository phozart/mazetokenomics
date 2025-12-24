import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { SOL_MINT } from '@/lib/jupiter/client';

// POST /api/packs/[id]/buy - Initiate pack purchase
export async function POST(request, { params }) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { totalAmountSol } = body;

    // Validate amount
    if (!totalAmountSol || totalAmountSol <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (totalAmountSol < 0.001) {
      return NextResponse.json({ error: 'Minimum amount is 0.001 SOL' }, { status: 400 });
    }

    // Get pack with tokens
    const pack = await prisma.pack.findFirst({
      where: { id, userId: session.user.id },
      include: {
        tokens: {
          orderBy: { weight: 'desc' },
        },
      },
    });

    if (!pack) {
      return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
    }

    if (pack.tokens.length === 0) {
      return NextResponse.json({ error: 'Pack has no tokens' }, { status: 400 });
    }

    // Calculate distribution
    const distribution = pack.tokens.map((token) => {
      const amountSol = (totalAmountSol * token.weight) / 100;
      return {
        tokenAddress: token.tokenAddress,
        symbol: token.symbol,
        name: token.name,
        weight: token.weight,
        amountSol,
        decimals: token.decimals,
        logoURI: token.logoURI,
        // Skip SOL tokens (just keep as SOL)
        skipSwap: token.tokenAddress === SOL_MINT,
      };
    });

    // Create purchase record with pending transactions
    const purchase = await prisma.packPurchase.create({
      data: {
        packId: pack.id,
        userId: session.user.id,
        totalAmountSol,
        status: 'pending',
        transactions: {
          create: distribution.map((d) => ({
            tokenAddress: d.tokenAddress,
            symbol: d.symbol,
            amountSol: d.amountSol,
            status: d.skipSwap ? 'success' : 'pending',
            amountReceived: d.skipSwap ? d.amountSol : null,
          })),
        },
      },
      include: {
        transactions: true,
        pack: {
          include: { tokens: true },
        },
      },
    });

    // Return purchase with distribution for client-side execution
    return NextResponse.json({
      success: true,
      purchase,
      distribution,
    });
  } catch (error) {
    console.error('Pack buy error:', error);
    return NextResponse.json({
      error: 'Failed to initiate pack purchase',
      details: error.message,
    }, { status: 500 });
  }
}

// PATCH /api/packs/[id]/buy - Update transaction status
export async function PATCH(request, { params }) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { purchaseId, transactionId, status, txSignature, amountReceived, error } = body;

    if (!purchaseId || !transactionId) {
      return NextResponse.json({ error: 'Missing purchaseId or transactionId' }, { status: 400 });
    }

    // Verify ownership
    const purchase = await prisma.packPurchase.findFirst({
      where: { id: purchaseId, userId: session.user.id },
    });

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    // Update transaction
    const transaction = await prisma.packTransaction.update({
      where: { id: transactionId },
      data: {
        status,
        txSignature: txSignature || null,
        amountReceived: amountReceived || null,
        error: error || null,
        executedAt: status === 'success' || status === 'failed' ? new Date() : null,
      },
    });

    // Check if all transactions are complete
    const allTransactions = await prisma.packTransaction.findMany({
      where: { purchaseId },
    });

    const allComplete = allTransactions.every(
      (t) => t.status === 'success' || t.status === 'failed'
    );

    if (allComplete) {
      const anyFailed = allTransactions.some((t) => t.status === 'failed');
      const allSucceeded = allTransactions.every((t) => t.status === 'success');

      await prisma.packPurchase.update({
        where: { id: purchaseId },
        data: {
          status: allSucceeded ? 'completed' : anyFailed ? 'partial' : 'failed',
          completedAt: new Date(),
        },
      });
    } else {
      // Mark as executing if not already
      if (purchase.status === 'pending') {
        await prisma.packPurchase.update({
          where: { id: purchaseId },
          data: { status: 'executing' },
        });
      }
    }

    return NextResponse.json({ success: true, transaction });
  } catch (error) {
    console.error('Transaction update error:', error);
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
  }
}
