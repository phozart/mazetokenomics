import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { MANUAL_CHECK_CONFIG } from '@/lib/constants';
import { calculateAutomaticScore, calculateManualScore, calculateOverallScore, determineRiskLevel } from '@/lib/vetting/scoring';

// POST - Submit a manual check review
export async function POST(request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { vettingProcessId, checkType, passed, notes, evidenceUrls } = body;

    // Validate required fields
    if (!vettingProcessId || !checkType || typeof passed !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: vettingProcessId, checkType, passed' },
        { status: 400 }
      );
    }

    // Get check config
    const config = MANUAL_CHECK_CONFIG[checkType];
    if (!config) {
      return NextResponse.json({ error: 'Invalid check type' }, { status: 400 });
    }

    // Upsert the manual check
    const manualCheck = await prisma.manualCheck.upsert({
      where: {
        vettingProcessId_checkType: {
          vettingProcessId,
          checkType,
        },
      },
      create: {
        vettingProcessId,
        checkType,
        status: 'COMPLETED',
        passed,
        score: passed ? 100 : 0,
        severity: config.severity,
        notes: notes || null,
        evidenceUrls: evidenceUrls || [],
        reviewerId: session.user.id,
        reviewedAt: new Date(),
      },
      update: {
        status: 'COMPLETED',
        passed,
        score: passed ? 100 : 0,
        notes: notes || null,
        evidenceUrls: evidenceUrls || [],
        reviewerId: session.user.id,
        reviewedAt: new Date(),
      },
    });

    // Recalculate scores
    const allManualChecks = await prisma.manualCheck.findMany({
      where: { vettingProcessId },
    });

    const automaticChecks = await prisma.automaticCheck.findMany({
      where: { vettingProcessId },
    });

    const automaticScore = calculateAutomaticScore(automaticChecks);
    const manualScore = calculateManualScore(allManualChecks);
    const overallScore = calculateOverallScore(automaticScore, manualScore);
    const riskLevel = determineRiskLevel(overallScore);

    // Check if all manual checks are complete
    const totalManualChecks = Object.keys(MANUAL_CHECK_CONFIG).length;
    const completedManualChecks = allManualChecks.filter(c => c.status === 'COMPLETED').length;
    const allManualComplete = completedManualChecks >= totalManualChecks;

    // Update vetting process
    await prisma.vettingProcess.update({
      where: { id: vettingProcessId },
      data: {
        manualScore,
        overallScore,
        riskLevel,
        status: allManualComplete ? 'REVIEW_COMPLETE' : 'IN_REVIEW',
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        vettingProcessId,
        userId: session.user.id,
        action: 'MANUAL_CHECK_COMPLETED',
        details: {
          checkType,
          passed,
          checkName: config.name,
        },
      },
    });

    // Remove any existing red flag for this check type first
    await prisma.redFlag.deleteMany({
      where: { vettingProcessId, checkType, source: 'manual' },
    });

    // Add red flag if check failed and is critical/high severity
    if (!passed && (config.severity === 'CRITICAL' || config.severity === 'HIGH')) {
      await prisma.redFlag.create({
        data: {
          vettingProcessId,
          flag: config.name,
          severity: config.severity,
          source: 'manual',
          checkType,
        },
      });
    }

    return NextResponse.json({
      success: true,
      manualCheck,
      scores: { automaticScore, manualScore, overallScore, riskLevel },
      progress: { completed: completedManualChecks, total: totalManualChecks },
    });
  } catch (error) {
    console.error('Manual check error:', error);
    return NextResponse.json({ error: 'Failed to save manual check' }, { status: 500 });
  }
}
