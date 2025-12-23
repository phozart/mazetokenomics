import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { runAutomatedChecks } from '@/lib/vetting/automated-checks';

// POST /api/tokens/[id]/run-checks - Re-run automated checks
export async function POST(request, { params }) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Run checks and return results
    const results = await runAutomatedChecks(id);

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('Error running checks:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to run checks' },
      { status: 500 }
    );
  }
}
