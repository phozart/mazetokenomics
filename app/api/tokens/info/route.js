import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getTokenPairs } from '@/lib/api/dexscreener';
import { getRugCheckReport, parseRugCheckData } from '@/lib/api/rugcheck';

/**
 * GET /api/tokens/info
 * Get token info including socials, description, and security checks
 *
 * Query params:
 * - address: Contract address
 * - chain: Blockchain chain
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const chain = searchParams.get('chain');

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    let info = {
      websites: [],
      socials: [],
      description: null,
      imageUrl: null,
    };
    let securityChecks = null;
    let correctAddress = address; // Will be updated from DexScreener if available

    // Fetch from DexScreener for socials and description
    try {
      const dexData = await getTokenPairs(address);
      const pair = dexData?.pairs?.[0];

      if (pair?.info) {
        info.websites = pair.info.websites || [];
        info.socials = pair.info.socials || [];
        info.imageUrl = pair.info.imageUrl || null;
      }

      // Get the correct address format from DexScreener (important for Solana Base58 case sensitivity)
      if (pair?.baseToken?.address) {
        correctAddress = pair.baseToken.address;
        console.log(`[TokenInfo] Got correct address from DexScreener: ${correctAddress}`);
      } else {
        console.log(`[TokenInfo] DexScreener did not return baseToken address for: ${address}`);
      }
    } catch (error) {
      console.error('Failed to fetch DexScreener info:', error);
    }

    // Fetch from RugCheck for Solana tokens
    // Use correctAddress from DexScreener which has proper Base58 case
    // Skip if address looks lowercased (Solana addresses are Base58, mixed case)
    const isLikelyLowercased = chain?.toUpperCase() === 'SOLANA' &&
      correctAddress === correctAddress.toLowerCase() &&
      /[a-z]/.test(correctAddress);

    if (chain?.toUpperCase() === 'SOLANA' && !isLikelyLowercased) {
      try {
        const rawRugCheck = await getRugCheckReport(correctAddress);
        if (rawRugCheck) {
          const rugCheckData = parseRugCheckData(rawRugCheck);

          // Get description from file meta
          if (rawRugCheck.fileMeta?.description) {
            info.description = rawRugCheck.fileMeta.description;
          }

          // Get image if not from DexScreener
          if (!info.imageUrl && rawRugCheck.fileMeta?.image) {
            info.imageUrl = rawRugCheck.fileMeta.image;
          }

          // Get the score from parsed data (already normalized 0-1)
          // parseRugCheckData already handles the score calculation
          const rugcheckScore = rugCheckData.score;

          securityChecks = {
            mintAuthority: rugCheckData.checks?.MINT_AUTHORITY?.passed === false,
            freezeAuthority: rugCheckData.checks?.FREEZE_AUTHORITY?.passed === false,
            mutableMetadata: rugCheckData.checks?.MUTABLE_METADATA?.passed === false,
            lpLocked: rugCheckData.checks?.LP_LOCKED?.value || 0,
            rugcheckScore: typeof rugcheckScore === 'number' && !isNaN(rugcheckScore) ? rugcheckScore : null,
            topHolderConcentration: rugCheckData.checks?.TOP_HOLDER_CONCENTRATION?.value || null,
          };
        }
      } catch (error) {
        console.error('Failed to fetch RugCheck info:', error);
      }
    } else if (isLikelyLowercased) {
      console.log(`[TokenInfo] Skipping RugCheck - address appears to be lowercased: ${correctAddress}`);
    }

    // Look up existing token and vetting process in our database
    let vettingData = null;
    try {
      const token = await prisma.token.findFirst({
        where: {
          contractAddress: {
            equals: address,
            mode: 'insensitive',
          },
          chain: chain?.toUpperCase(),
        },
        include: {
          vettingProcess: {
            select: {
              id: true,
              overallScore: true,
              riskLevel: true,
              status: true,
              redFlags: { select: { id: true, flag: true, severity: true } },
              greenFlags: { select: { id: true, flag: true } },
            },
          },
        },
      });

      if (token?.vettingProcess) {
        vettingData = {
          vettingProcessId: token.vettingProcess.id,
          overallScore: token.vettingProcess.overallScore,
          riskLevel: token.vettingProcess.riskLevel,
          status: token.vettingProcess.status,
          redFlags: token.vettingProcess.redFlags || [],
          greenFlags: token.vettingProcess.greenFlags || [],
        };
      }
    } catch (error) {
      console.error('Failed to fetch vetting data:', error);
    }

    return NextResponse.json({
      info,
      securityChecks,
      vettingData,
    });
  } catch (error) {
    console.error('Token info fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch token info' }, { status: 500 });
  }
}
