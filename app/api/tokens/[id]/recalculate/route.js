import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import {
  calculateAutomaticScore,
  calculateManualScore,
  calculateOverallScore,
  determineRiskLevel,
} from '@/lib/vetting/scoring';
import { MANUAL_CHECK_CONFIG } from '@/lib/constants';

// POST /api/tokens/[id]/recalculate - Recalculate scores for a vetting process
export async function POST(request, { params }) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: vettingProcessId } = await params;

    // Get all checks
    const [automaticChecks, manualChecks] = await Promise.all([
      prisma.automaticCheck.findMany({
        where: { vettingProcessId },
      }),
      prisma.manualCheck.findMany({
        where: { vettingProcessId },
      }),
    ]);

    // Calculate scores
    const automaticScore = calculateAutomaticScore(automaticChecks);
    const manualScore = calculateManualScore(manualChecks);
    const overallScore = calculateOverallScore(automaticScore, manualScore);
    const riskLevel = determineRiskLevel(overallScore || automaticScore);

    // Check completion status
    const totalManualChecks = Object.keys(MANUAL_CHECK_CONFIG).length;
    const completedManualChecks = manualChecks.filter(c => c.status === 'COMPLETED').length;
    const allManualComplete = completedManualChecks >= totalManualChecks;
    const hasManualReview = manualChecks.some(c => c.status === 'COMPLETED');

    // Determine new status based on progress
    let newStatus = null;
    const vettingProcess = await prisma.vettingProcess.findUnique({
      where: { id: vettingProcessId },
    });

    if (vettingProcess) {
      // Don't change status if already APPROVED or REJECTED
      if (!['APPROVED', 'REJECTED'].includes(vettingProcess.status)) {
        if (allManualComplete) {
          newStatus = 'REVIEW_COMPLETE';
        } else if (hasManualReview) {
          newStatus = 'IN_REVIEW';
        } else if (automaticChecks.some(c => c.status === 'COMPLETED')) {
          newStatus = 'AUTO_COMPLETE';
        }
      }
    }

    // Update vetting process
    const updateData = {
      automaticScore,
      manualScore,
      overallScore,
      riskLevel,
    };

    if (newStatus) {
      updateData.status = newStatus;
    }

    await prisma.vettingProcess.update({
      where: { id: vettingProcessId },
      data: updateData,
    });

    // Log activity
    await prisma.activity.create({
      data: {
        vettingProcessId,
        userId: session.user.id,
        action: 'SCORES_RECALCULATED',
        details: {
          automaticScore,
          manualScore,
          overallScore,
          riskLevel,
        },
      },
    });

    return NextResponse.json({
      success: true,
      scores: {
        automaticScore,
        manualScore,
        overallScore,
        riskLevel,
      },
      progress: {
        manual: { completed: completedManualChecks, total: totalManualChecks },
        automatic: { completed: automaticChecks.filter(c => c.status === 'COMPLETED').length },
      },
    });
  } catch (error) {
    console.error('Recalculate scores error:', error);
    return NextResponse.json(
      { error: 'Failed to recalculate scores' },
      { status: 500 }
    );
  }
}
