import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET /api/orders - Get user's orders
export async function GET(request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    const where = { userId: session.user.id };
    if (status) where.status = status;
    if (type) where.orderType = type;

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Orders fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

// POST /api/orders - Create a new order
export async function POST(request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      tokenAddress,
      symbol,
      orderType,
      side,
      amountSol,
      amountTokens,
      triggerPrice,
      currentPrice,
      expiresAt,
      // Jupiter Limit Order fields
      jupiterOrderPubkey,
      txSignature,
      inputMint,
      outputMint,
      makingAmount,
      takingAmount,
      tokenDecimals,
    } = body;

    // Validate required fields
    if (!tokenAddress || !symbol) {
      return NextResponse.json({ error: 'Token address and symbol are required' }, { status: 400 });
    }

    const validTypes = ['limit_buy', 'limit_sell', 'stop_loss', 'take_profit'];
    if (!orderType || !validTypes.includes(orderType)) {
      return NextResponse.json(
        { error: `Order type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    if (!triggerPrice || triggerPrice <= 0) {
      return NextResponse.json({ error: 'Valid trigger price is required' }, { status: 400 });
    }

    // Validate amounts based on order type
    const isBuyOrder = orderType === 'limit_buy';
    const isSellOrder = ['limit_sell', 'stop_loss', 'take_profit'].includes(orderType);

    if (isBuyOrder && (!amountSol || amountSol <= 0)) {
      return NextResponse.json({ error: 'Amount in SOL is required for buy orders' }, { status: 400 });
    }

    if (isSellOrder && (!amountTokens || amountTokens <= 0)) {
      return NextResponse.json({ error: 'Token amount is required for sell orders' }, { status: 400 });
    }

    // Check for duplicate active orders
    const existingOrder = await prisma.order.findFirst({
      where: {
        userId: session.user.id,
        tokenAddress,
        orderType,
        status: 'active',
      },
    });

    if (existingOrder) {
      return NextResponse.json(
        { error: 'You already have an active order of this type for this token' },
        { status: 409 }
      );
    }

    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        tokenAddress,
        symbol,
        orderType,
        side: isBuyOrder ? 'buy' : 'sell',
        amountSol: amountSol || null,
        amountTokens: amountTokens || null,
        triggerPrice,
        currentPrice: currentPrice || null,
        status: 'active',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        // Jupiter Limit Order fields
        jupiterOrderPubkey: jupiterOrderPubkey || null,
        txSignature: txSignature || null,
        inputMint: inputMint || null,
        outputMint: outputMint || null,
        makingAmount: makingAmount || null,
        takingAmount: takingAmount || null,
        tokenDecimals: tokenDecimals || null,
      },
    });

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json({
      error: 'Failed to create order',
      details: error.message,
    }, { status: 500 });
  }
}
