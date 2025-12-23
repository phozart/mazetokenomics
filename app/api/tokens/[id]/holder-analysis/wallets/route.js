import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

/**
 * GET /api/tokens/[id]/holder-analysis/wallets
 * Get paginated list of analyzed wallets
 *
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - sort: Sort field (balance, percentage, ageInDays, riskFlagCount)
 * - order: Sort order (asc, desc)
 * - filter: Filter type (all, suspicious, fresh, clustered)
 */
export async function GET(request, { params }) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    // Parse query params
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const sort = searchParams.get('sort') || 'percentage';
    const order = searchParams.get('order') || 'desc';
    const filter = searchParams.get('filter') || 'all';

    // Get vetting process with holder analysis
    const vettingProcess = await prisma.vettingProcess.findUnique({
      where: { id },
      include: {
        holderAnalysis: true,
      },
    });

    if (!vettingProcess) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    if (!vettingProcess.holderAnalysis) {
      return NextResponse.json({ error: 'Holder analysis not found' }, { status: 404 });
    }

    // Build where clause based on filter
    const whereClause = {
      holderAnalysisId: vettingProcess.holderAnalysis.id,
    };

    switch (filter) {
      case 'suspicious':
        whereClause.OR = [
          { hasCriticalFlag: true },
          { riskFlagCount: { gte: 2 } },
        ];
        break;
      case 'fresh':
        whereClause.ageInDays = { lt: 7 };
        break;
      case 'clustered':
        whereClause.clusterId = { not: null };
        break;
      // 'all' - no additional filters
    }

    // Build sort clause
    const orderByMap = {
      balance: { balance: order },
      percentage: { percentage: order },
      ageInDays: { ageInDays: order },
      riskFlagCount: { riskFlagCount: order },
      rank: { rank: order },
    };
    const orderBy = orderByMap[sort] || { percentage: 'desc' };

    // Get total count
    const totalCount = await prisma.walletTrace.count({
      where: whereClause,
    });

    // Get paginated wallets
    const wallets = await prisma.walletTrace.findMany({
      where: whereClause,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      wallets,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore: page < totalPages,
      },
      filters: {
        current: filter,
        available: ['all', 'suspicious', 'fresh', 'clustered'],
      },
    });
  } catch (error) {
    console.error('Error fetching wallets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallets' },
      { status: 500 }
    );
  }
}
