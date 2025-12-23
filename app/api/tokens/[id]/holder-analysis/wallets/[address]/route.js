import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { traceFundingChain, getWalletAge } from '@/lib/api/holder-analysis';

/**
 * GET /api/tokens/[id]/holder-analysis/wallets/[address]
 * Get detailed wallet trace with funding chain
 *
 * Query params:
 * - depth: Funding chain trace depth (default: 4, max: 6)
 * - refresh: Force refresh funding chain data (true/false)
 */
export async function GET(request, { params }) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, address } = await params;
    const { searchParams } = new URL(request.url);

    const depth = Math.min(6, Math.max(1, parseInt(searchParams.get('depth') || '4')));
    const refresh = searchParams.get('refresh') === 'true';

    // Get vetting process with holder analysis
    const vettingProcess = await prisma.vettingProcess.findUnique({
      where: { id },
      include: {
        token: true,
        holderAnalysis: true,
      },
    });

    if (!vettingProcess) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    if (!vettingProcess.holderAnalysis) {
      return NextResponse.json({ error: 'Holder analysis not found' }, { status: 404 });
    }

    // Find existing wallet trace
    let walletTrace = await prisma.walletTrace.findFirst({
      where: {
        holderAnalysisId: vettingProcess.holderAnalysis.id,
        walletAddress: {
          equals: address,
          mode: 'insensitive',
        },
      },
    });

    // If refresh requested or no funding chain data, fetch it
    if (refresh || !walletTrace?.fundingChain) {
      const chain = vettingProcess.token.chain;

      // Trace funding chain
      const fundingChainData = await traceFundingChain(address, chain, depth);

      // Get wallet age if not already have it
      let ageData = null;
      if (!walletTrace?.ageInDays) {
        ageData = await getWalletAge(address, chain);
      }

      // Extract flags from funding chain
      const allFlags = [];
      function extractFlags(node) {
        if (node?.flags) {
          allFlags.push(...node.flags);
        }
        if (node?.children) {
          node.children.forEach(extractFlags);
        }
      }
      extractFlags(fundingChainData);

      // Determine funding source type
      let fundingSourceType = 'unknown';
      if (fundingChainData?.addressInfo?.type) {
        fundingSourceType = fundingChainData.addressInfo.type;
      }

      // Calculate funding depth
      let fundingDepth = 0;
      function calcDepth(node, d = 0) {
        fundingDepth = Math.max(fundingDepth, d);
        if (node?.children) {
          node.children.forEach(child => calcDepth(child, d + 1));
        }
      }
      calcDepth(fundingChainData);

      // Update or create wallet trace
      const updateData = {
        fundingChain: fundingChainData,
        fundingDepth,
        primaryFundingSource: fundingChainData?.fundingSource || null,
        fundingSourceType,
        riskFlags: allFlags,
        riskFlagCount: allFlags.length,
        hasCriticalFlag: allFlags.some(f => f.severity === 'critical'),
        ...(ageData ? {
          ageInDays: ageData.ageInDays,
          firstTxDate: ageData.firstTxDate,
        } : {}),
      };

      if (walletTrace) {
        walletTrace = await prisma.walletTrace.update({
          where: { id: walletTrace.id },
          data: updateData,
        });
      } else {
        // Create new wallet trace
        walletTrace = await prisma.walletTrace.create({
          data: {
            holderAnalysisId: vettingProcess.holderAnalysis.id,
            walletAddress: address,
            chain: vettingProcess.token.chain,
            walletType: 'UNKNOWN',
            ...updateData,
          },
        });
      }
    }

    // Find related wallets in same cluster
    let clusterMembers = [];
    if (walletTrace.clusterId) {
      clusterMembers = await prisma.walletTrace.findMany({
        where: {
          holderAnalysisId: vettingProcess.holderAnalysis.id,
          clusterId: walletTrace.clusterId,
          NOT: { walletAddress: address },
        },
        take: 10,
        orderBy: { percentage: 'desc' },
      });
    }

    // Get block explorer URL
    const explorerUrls = {
      ETHEREUM: 'https://etherscan.io/address/',
      BSC: 'https://bscscan.com/address/',
      POLYGON: 'https://polygonscan.com/address/',
      ARBITRUM: 'https://arbiscan.io/address/',
      BASE: 'https://basescan.org/address/',
      OPTIMISM: 'https://optimistic.etherscan.io/address/',
      AVALANCHE: 'https://snowtrace.io/address/',
      SOLANA: 'https://solscan.io/account/',
    };

    const explorerUrl = explorerUrls[vettingProcess.token.chain] + address;

    return NextResponse.json({
      wallet: walletTrace,
      clusterMembers,
      explorerUrl,
      token: {
        symbol: vettingProcess.token.symbol,
        chain: vettingProcess.token.chain,
      },
    });
  } catch (error) {
    console.error('Error fetching wallet details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet details' },
      { status: 500 }
    );
  }
}
