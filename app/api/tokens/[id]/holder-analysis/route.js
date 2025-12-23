import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { runHolderAnalysis, traceFundingChain } from '@/lib/api/holder-analysis';

/**
 * GET /api/tokens/[id]/holder-analysis
 * Fetch holder analysis for a token
 */
export async function GET(request, { params }) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Get vetting process with token
    const vettingProcess = await prisma.vettingProcess.findUnique({
      where: { id },
      include: {
        token: true,
      },
    });

    if (!vettingProcess) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    // Check if holder analysis exists
    const holderAnalysis = await prisma.holderAnalysis.findUnique({
      where: { vettingProcessId: id },
      include: {
        walletTraces: {
          orderBy: { percentage: 'desc' },
          take: 50,
        },
      },
    });

    // If no holder analysis exists yet, return empty state
    if (!holderAnalysis) {
      return NextResponse.json({
        status: 'NOT_STARTED',
        message: 'Holder analysis has not been run yet',
        token: vettingProcess.token,
      });
    }

    return NextResponse.json({
      status: holderAnalysis.status,
      analysis: holderAnalysis,
      token: vettingProcess.token,
    });
  } catch (error) {
    console.error('Error fetching holder analysis:', error);
    return NextResponse.json(
      { error: 'Failed to fetch holder analysis', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tokens/[id]/holder-analysis
 * Trigger holder analysis for a token
 */
export async function POST(request, { params }) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Get vetting process and token
    const vettingProcess = await prisma.vettingProcess.findUnique({
      where: { id },
      include: {
        token: true,
      },
    });

    if (!vettingProcess) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    const { token } = vettingProcess;

    // Check if holder analysis exists
    let holderAnalysis = await prisma.holderAnalysis.findUnique({
      where: { vettingProcessId: id },
    });

    if (!holderAnalysis) {
      holderAnalysis = await prisma.holderAnalysis.create({
        data: {
          vettingProcessId: id,
          status: 'RUNNING',
        },
      });
    } else {
      holderAnalysis = await prisma.holderAnalysis.update({
        where: { id: holderAnalysis.id },
        data: { status: 'RUNNING' },
      });
    }

    // Run the analysis (this could be moved to a background job for production)
    try {
      const results = await runHolderAnalysis(token.contractAddress, token.chain, {
        tokenCreationDate: token.createdAt,
        deployerAddress: null, // Would need to fetch from contract data
        liquidityUSD: null, // Would need to fetch from DEXScreener
      });

      // Extract metrics from results
      const updateData = {
        status: 'COMPLETED',
        analyzedAt: new Date(),

        // Concentration metrics
        giniCoefficient: results.GINI_COEFFICIENT?.value || null,
        nakamotoCoefficient: results.NAKAMOTO_COEFFICIENT?.value || null,
        effectiveHolders: results.EFFECTIVE_HOLDER_COUNT?.value || null,
        top10Percent: results.HOLDER_DISTRIBUTION?.value?.top10 || null,
        top50Percent: results.HOLDER_DISTRIBUTION?.value?.top50 || null,
        top100Percent: results.HOLDER_DISTRIBUTION?.value?.top100 || null,

        // Risk scores
        sybilScore: results.SYBIL_SCORE?.value || null,
        insiderScore: results.INSIDER_SCORE?.value || null,
        exitRiskScore: results.EXIT_RISK_SCORE?.value || null,
        smartMoneyRatio: results.SMART_MONEY_RATIO?.value || null,

        // Temporal metrics
        coordinatedBuyingPct: results.COORDINATED_BUYING?.value || null,
        sniperWalletCount: results.SNIPER_ACTIVITY?.value || null,
        avgHoldingDuration: results.HOLDING_DURATIONS?.value || null,
        diamondHandsRatio: results.HOLDING_DURATIONS?.rawData?.diamondHandsRatio || null,
        paperHandsRatio: results.HOLDING_DURATIONS?.rawData?.paperHandsRatio || null,

        // Cluster analysis
        clusterCount: results.FUNDING_GRAPH?.value?.clusters?.length || 0,
        suspiciousClusterCount: results.FUNDING_GRAPH?.value?.clusters?.filter(c => c.size > 3).length || 0,
        largestClusterSize: results.FUNDING_GRAPH?.value?.metrics?.maxClusterSize || 0,

        // Network graph metrics
        graphDensity: results.FUNDING_GRAPH?.value?.metrics?.density || null,
        hubWalletCount: results.FUNDING_GRAPH?.value?.hubs?.length || 0,

        // Raw data for visualization
        fundingGraph: results.FUNDING_GRAPH?.value ? serializeGraph(results.FUNDING_GRAPH.value) : null,
        clusters: results.FUNDING_GRAPH?.value?.clusters || null,
        topHoldersDetailed: results.TOP_HOLDER_WALLET_AGE?.rawData || null,
      };

      // Update holder analysis with results
      holderAnalysis = await prisma.holderAnalysis.update({
        where: { id: holderAnalysis.id },
        data: updateData,
      });

      // Create wallet traces for top holders
      if (results.TOP_HOLDER_WALLET_AGE?.rawData) {
        const walletTraces = results.TOP_HOLDER_WALLET_AGE.rawData.map((holder, index) => ({
          holderAnalysisId: holderAnalysis.id,
          walletAddress: holder.address,
          chain: token.chain,
          percentage: holder.percentage,
          ageInDays: holder.ageInDays,
          rank: index + 1,
          walletType: 'UNKNOWN',
          riskFlagCount: 0,
        }));

        // Delete existing traces and create new ones
        await prisma.walletTrace.deleteMany({
          where: { holderAnalysisId: holderAnalysis.id },
        });

        await prisma.walletTrace.createMany({
          data: walletTraces,
        });
      }

      // Log activity
      await prisma.activity.create({
        data: {
          vettingProcessId: id,
          userId: session.user.id,
          action: 'HOLDER_ANALYSIS_COMPLETED',
          details: {
            sybilScore: updateData.sybilScore,
            insiderScore: updateData.insiderScore,
            exitRiskScore: updateData.exitRiskScore,
            giniCoefficient: updateData.giniCoefficient,
          },
        },
      });

      return NextResponse.json({
        status: 'COMPLETED',
        analysis: holderAnalysis,
      });
    } catch (analysisError) {
      console.error('Holder analysis failed:', analysisError);

      // Update status to failed
      await prisma.holderAnalysis.update({
        where: { id: holderAnalysis.id },
        data: { status: 'FAILED' },
      });

      return NextResponse.json(
        { error: 'Holder analysis failed', details: analysisError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error running holder analysis:', error);
    return NextResponse.json(
      { error: 'Failed to run holder analysis' },
      { status: 500 }
    );
  }
}

/**
 * Serialize graph data for JSON storage (Maps don't serialize well)
 */
function serializeGraph(graph) {
  if (!graph) return null;

  return {
    nodes: graph.nodes ? Array.from(graph.nodes.entries()).map(([addr, data]) => ({
      address: addr,
      ...data,
    })) : [],
    edges: graph.edges || [],
    hubs: graph.hubs || [],
    clusters: graph.clusters || [],
    metrics: graph.metrics || {},
  };
}
