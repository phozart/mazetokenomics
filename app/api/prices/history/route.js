import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/prices/history?address={address}&chain={chain}&period=24h|30d
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const chain = searchParams.get('chain');
    const period = searchParams.get('period') || '24h';

    if (!address || !chain) {
      return NextResponse.json(
        { error: 'Address and chain are required' },
        { status: 400 }
      );
    }

    // Calculate time range based on period
    let startDate;
    let groupByHours = 1; // Default: hourly data points

    if (period === '24h') {
      startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      groupByHours = 1; // Every hour
    } else if (period === '30d') {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      groupByHours = 24; // Daily aggregation
    } else {
      return NextResponse.json(
        { error: 'Invalid period. Use 24h or 30d' },
        { status: 400 }
      );
    }

    // Fetch snapshots
    const snapshots = await prisma.priceSnapshot.findMany({
      where: {
        contractAddress: address,
        chain: chain,
        timestamp: { gte: startDate },
      },
      orderBy: { timestamp: 'asc' },
      select: {
        priceUsd: true,
        marketCap: true,
        volume24h: true,
        liquidity: true,
        timestamp: true,
      },
    });

    // If we need daily aggregation (30d), group by day
    let chartData;
    if (groupByHours === 24) {
      // Group by day and take the last snapshot of each day
      const dailyMap = new Map();
      for (const snapshot of snapshots) {
        const dayKey = snapshot.timestamp.toISOString().split('T')[0];
        // Keep the latest snapshot for each day
        dailyMap.set(dayKey, snapshot);
      }
      chartData = Array.from(dailyMap.values()).map((s) => ({
        timestamp: s.timestamp.toISOString(),
        price: s.priceUsd,
        marketCap: s.marketCap,
        volume: s.volume24h,
        liquidity: s.liquidity,
      }));
    } else {
      // Return hourly data as-is
      chartData = snapshots.map((s) => ({
        timestamp: s.timestamp.toISOString(),
        price: s.priceUsd,
        marketCap: s.marketCap,
        volume: s.volume24h,
        liquidity: s.liquidity,
      }));
    }

    // Calculate price change over the period
    let priceChange = null;
    if (chartData.length >= 2) {
      const firstPrice = chartData[0].price;
      const lastPrice = chartData[chartData.length - 1].price;
      if (firstPrice > 0) {
        priceChange = ((lastPrice - firstPrice) / firstPrice) * 100;
      }
    }

    return NextResponse.json({
      data: chartData,
      period,
      dataPoints: chartData.length,
      priceChange,
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Price history error:', error);
    return NextResponse.json({ error: 'Failed to fetch price history' }, { status: 500 });
  }
}
