import { NextResponse } from 'next/server';
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

    // Fetch from DexScreener for socials and description
    try {
      const dexData = await getTokenPairs(address);
      const pair = dexData?.pairs?.[0];

      if (pair?.info) {
        info.websites = pair.info.websites || [];
        info.socials = pair.info.socials || [];
        info.imageUrl = pair.info.imageUrl || null;
      }
    } catch (error) {
      console.error('Failed to fetch DexScreener info:', error);
    }

    // Fetch from RugCheck for Solana tokens
    if (chain === 'SOLANA') {
      try {
        const rawRugCheck = await getRugCheckReport(address);
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

          // Build security checks
          securityChecks = {
            mintAuthority: rugCheckData.checks?.MINT_AUTHORITY?.passed === false,
            freezeAuthority: rugCheckData.checks?.FREEZE_AUTHORITY?.passed === false,
            mutableMetadata: rugCheckData.checks?.MUTABLE_METADATA?.passed === false,
            lpLocked: rugCheckData.checks?.LP_LOCKED?.value || 0,
            rugcheckScore: rawRugCheck.score_normalised ?? (rawRugCheck.score / 1000),
            topHolderConcentration: rugCheckData.checks?.TOP_HOLDER_CONCENTRATION?.value || null,
          };
        }
      } catch (error) {
        console.error('Failed to fetch RugCheck info:', error);
      }
    }

    return NextResponse.json({
      info,
      securityChecks,
    });
  } catch (error) {
    console.error('Token info fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch token info' }, { status: 500 });
  }
}
