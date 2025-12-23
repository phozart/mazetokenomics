import { SEVERITY_WEIGHTS, RISK_THRESHOLDS, AUTO_CHECK_CONFIG, MANUAL_CHECK_CONFIG } from '../constants';

/**
 * Calculate automatic check score (40% of total)
 * @param {Array} automaticChecks - Array of automatic check results
 * @returns {number} Score from 0-100
 */
export function calculateAutomaticScore(automaticChecks) {
  if (!automaticChecks || automaticChecks.length === 0) {
    return null;
  }

  let totalWeight = 0;
  let weightedScore = 0;

  for (const check of automaticChecks) {
    if (check.status !== 'COMPLETED') continue;

    const config = AUTO_CHECK_CONFIG[check.checkType];
    if (!config) continue;

    const severityWeight = SEVERITY_WEIGHTS[check.severity] || 0.5;
    const weight = config.weight * severityWeight;

    totalWeight += weight;

    // Passed checks contribute their full weight to the score
    if (check.passed) {
      weightedScore += weight;
    }
  }

  if (totalWeight === 0) return null;

  return Math.round((weightedScore / totalWeight) * 100);
}

/**
 * Calculate manual check score (60% of total)
 * @param {Array} manualChecks - Array of manual check results
 * @returns {number} Score from 0-100
 */
export function calculateManualScore(manualChecks) {
  if (!manualChecks || manualChecks.length === 0) {
    return null;
  }

  let totalWeight = 0;
  let weightedScore = 0;

  for (const check of manualChecks) {
    if (check.status !== 'COMPLETED') continue;

    const config = MANUAL_CHECK_CONFIG[check.checkType];
    if (!config) continue;

    const severityWeight = SEVERITY_WEIGHTS[check.severity] || 0.5;
    const weight = config.weight * severityWeight;

    totalWeight += weight;

    // Use the check's score if available, otherwise use pass/fail
    if (check.score !== null && check.score !== undefined) {
      weightedScore += (check.score / 100) * weight;
    } else if (check.passed) {
      weightedScore += weight;
    }
  }

  if (totalWeight === 0) return null;

  return Math.round((weightedScore / totalWeight) * 100);
}

/**
 * Calculate overall vetting score
 * @param {number} automaticScore - Automatic checks score (0-100)
 * @param {number} manualScore - Manual checks score (0-100)
 * @returns {number} Overall score from 0-100
 */
export function calculateOverallScore(automaticScore, manualScore) {
  const AUTO_WEIGHT = 0.4;
  const MANUAL_WEIGHT = 0.6;

  // If both scores are available
  if (automaticScore !== null && manualScore !== null) {
    return Math.round(
      (automaticScore * AUTO_WEIGHT) + (manualScore * MANUAL_WEIGHT)
    );
  }

  // If only automatic score is available
  if (automaticScore !== null) {
    return automaticScore;
  }

  // If only manual score is available
  if (manualScore !== null) {
    return manualScore;
  }

  return null;
}

/**
 * Determine risk level from score
 * @param {number} score - Score from 0-100
 * @returns {string} Risk level: LOW, MEDIUM, HIGH, or EXTREME
 */
export function determineRiskLevel(score) {
  if (score === null || score === undefined) return null;

  if (score >= RISK_THRESHOLDS.LOW) return 'LOW';
  if (score >= RISK_THRESHOLDS.MEDIUM) return 'MEDIUM';
  if (score >= RISK_THRESHOLDS.HIGH) return 'HIGH';
  return 'EXTREME';
}

/**
 * Generate red flags from check results
 * @param {Array} automaticChecks - Automatic check results
 * @param {Array} manualChecks - Manual check results
 * @returns {Array} Array of red flag objects
 */
export function generateRedFlags(automaticChecks = [], manualChecks = []) {
  const redFlags = [];

  // Check automatic results for failures
  for (const check of automaticChecks) {
    if (check.status !== 'COMPLETED') continue;
    if (check.passed) continue;

    const config = AUTO_CHECK_CONFIG[check.checkType];
    if (!config) continue;

    // Only flag critical and high severity failures
    if (['CRITICAL', 'HIGH'].includes(check.severity)) {
      redFlags.push({
        flag: config.name,
        severity: check.severity,
        source: 'automatic',
        checkType: check.checkType,
        details: check.details,
      });
    }
  }

  // Check manual results for failures
  for (const check of manualChecks) {
    if (check.status !== 'COMPLETED') continue;
    if (check.passed) continue;

    const config = MANUAL_CHECK_CONFIG[check.checkType];
    if (!config) continue;

    if (['CRITICAL', 'HIGH'].includes(check.severity)) {
      redFlags.push({
        flag: config.name,
        severity: check.severity,
        source: 'manual',
        checkType: check.checkType,
        details: check.notes,
      });
    }
  }

  return redFlags;
}

/**
 * Generate green flags from check results
 * @param {Array} automaticChecks - Automatic check results
 * @param {Array} manualChecks - Manual check results
 * @returns {Array} Array of green flag objects
 */
export function generateGreenFlags(automaticChecks = [], manualChecks = []) {
  const greenFlags = [];

  // Notable automatic passes
  const notableAutoChecks = [
    'CONTRACT_VERIFIED',
    'HONEYPOT_DETECTION',
    'HIDDEN_OWNER',
  ];

  for (const check of automaticChecks) {
    if (check.status !== 'COMPLETED') continue;
    if (!check.passed) continue;
    if (!notableAutoChecks.includes(check.checkType)) continue;

    const config = AUTO_CHECK_CONFIG[check.checkType];
    if (!config) continue;

    greenFlags.push({
      flag: `${config.name} - Passed`,
      source: 'automatic',
      checkType: check.checkType,
    });
  }

  // Notable manual passes
  const notableManualChecks = [
    'TEAM_KYC',
    'AUDIT_REVIEW',
    'LIQUIDITY_LOCK_VERIFY',
  ];

  for (const check of manualChecks) {
    if (check.status !== 'COMPLETED') continue;
    if (!check.passed) continue;
    if (!notableManualChecks.includes(check.checkType)) continue;

    const config = MANUAL_CHECK_CONFIG[check.checkType];
    if (!config) continue;

    greenFlags.push({
      flag: `${config.name} - Verified`,
      source: 'manual',
      checkType: check.checkType,
    });
  }

  return greenFlags;
}

/**
 * Calculate completion percentage
 * @param {Array} automaticChecks - Automatic checks
 * @param {Array} manualChecks - Manual checks
 * @returns {Object} Completion percentages
 */
export function calculateCompletionProgress(automaticChecks = [], manualChecks = []) {
  const autoTotal = Object.keys(AUTO_CHECK_CONFIG).length;
  const manualTotal = Object.keys(MANUAL_CHECK_CONFIG).length;

  const autoCompleted = automaticChecks.filter(c => c.status === 'COMPLETED').length;
  const manualCompleted = manualChecks.filter(c => c.status === 'COMPLETED').length;

  return {
    automatic: {
      completed: autoCompleted,
      total: autoTotal,
      percentage: Math.round((autoCompleted / autoTotal) * 100),
    },
    manual: {
      completed: manualCompleted,
      total: manualTotal,
      percentage: Math.round((manualCompleted / manualTotal) * 100),
    },
    overall: {
      completed: autoCompleted + manualCompleted,
      total: autoTotal + manualTotal,
      percentage: Math.round(((autoCompleted + manualCompleted) / (autoTotal + manualTotal)) * 100),
    },
  };
}
