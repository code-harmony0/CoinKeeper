/**
 * Risk Score Utility
 * Deterministic, testable risk scoring function
 */

export interface RiskScoreInput {
  onTimeRate: number;           // 0-1, percentage of on-time payments
  latePaymentCount: number;     // Number of late payments in period
  missedPaymentCount: number;   // Number of missed payments
  averageDelayDays: number;     // Average days late for late payments
  accountAge: number;           // Days since account creation
  recentActivityDays: number;   // Days since last activity
  totalPayments: number;        // Total payment attempts
  consecutiveLatePayments: number; // Current streak of late payments
}

export interface RiskScoreResult {
  score: number;                // 0-100, higher = more risky
  category: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  recommendations: string[];
}

// Weight configuration for risk factors
const RISK_WEIGHTS = {
  onTimeRate: 30,           // Max 30 points for poor on-time rate
  latePayments: 20,         // Max 20 points for late payments
  missedPayments: 25,       // Max 25 points for missed payments
  averageDelay: 10,         // Max 10 points for average delay
  accountAge: 5,            // Max 5 points for new accounts
  inactivity: 10,           // Max 10 points for inactivity
};

// Thresholds
const THRESHOLDS = {
  onTimeRateGood: 0.9,      // 90% on-time is good
  onTimeRateBad: 0.7,       // Below 70% is concerning
  maxAcceptableLate: 2,     // More than 2 late payments adds risk
  maxAcceptableMissed: 1,   // Any missed payment adds risk
  delayDaysWarning: 7,      // 7+ days delay is warning
  delayDaysCritical: 14,    // 14+ days delay is critical
  newAccountDays: 30,       // Account < 30 days is new
  inactivityWarning: 30,    // 30+ days inactive is warning
  inactivityCritical: 60,   // 60+ days inactive is critical
  minPaymentsForScore: 3,   // Need at least 3 payments for reliable score
};

/**
 * Compute risk score for a member
 * Score ranges: 0-25 (low), 26-50 (medium), 51-75 (high), 76-100 (critical)
 */
export const computeRiskScore = (input: RiskScoreInput): RiskScoreResult => {
  let score = 0;
  const factors: string[] = [];
  const recommendations: string[] = [];

  // Factor 1: On-time rate (0-30 points)
  if (input.totalPayments >= THRESHOLDS.minPaymentsForScore) {
    const onTimeScore = Math.max(0, (1 - input.onTimeRate)) * RISK_WEIGHTS.onTimeRate;
    score += onTimeScore;

    if (input.onTimeRate < THRESHOLDS.onTimeRateBad) {
      factors.push(`Low on-time payment rate: ${(input.onTimeRate * 100).toFixed(0)}%`);
      recommendations.push('Set up payment reminders 3 days before due date');
    } else if (input.onTimeRate < THRESHOLDS.onTimeRateGood) {
      factors.push(`On-time rate below target: ${(input.onTimeRate * 100).toFixed(0)}%`);
    }
  }

  // Factor 2: Late payment count (0-20 points)
  if (input.latePaymentCount > THRESHOLDS.maxAcceptableLate) {
    const lateScore = Math.min(
      RISK_WEIGHTS.latePayments,
      (input.latePaymentCount - THRESHOLDS.maxAcceptableLate) * 4
    );
    score += lateScore;
    factors.push(`${input.latePaymentCount} late payments in period`);
  }

  // Factor 3: Missed payments (0-25 points, most severe)
  if (input.missedPaymentCount > 0) {
    const missedScore = Math.min(
      RISK_WEIGHTS.missedPayments,
      input.missedPaymentCount * 10
    );
    score += missedScore;
    factors.push(`${input.missedPaymentCount} missed payments`);
    recommendations.push('Contact member about missed payments immediately');
  }

  // Factor 4: Average delay days (0-10 points)
  if (input.averageDelayDays >= THRESHOLDS.delayDaysCritical) {
    score += RISK_WEIGHTS.averageDelay;
    factors.push(`High average delay: ${input.averageDelayDays} days`);
    recommendations.push('Consider automatic payment collection');
  } else if (input.averageDelayDays >= THRESHOLDS.delayDaysWarning) {
    score += RISK_WEIGHTS.averageDelay * 0.5;
    factors.push(`Average delay: ${input.averageDelayDays} days`);
  }

  // Factor 5: Account age (0-5 points for new accounts)
  if (input.accountAge < THRESHOLDS.newAccountDays) {
    score += RISK_WEIGHTS.accountAge;
    factors.push('New member (limited history)');
  }

  // Factor 6: Inactivity (0-10 points)
  if (input.recentActivityDays >= THRESHOLDS.inactivityCritical) {
    score += RISK_WEIGHTS.inactivity;
    factors.push(`Inactive for ${input.recentActivityDays} days`);
    recommendations.push('Reach out to verify member status');
  } else if (input.recentActivityDays >= THRESHOLDS.inactivityWarning) {
    score += RISK_WEIGHTS.inactivity * 0.5;
    factors.push(`Low activity: ${input.recentActivityDays} days since last action`);
  }

  // Bonus: Consecutive late payments (compound risk)
  if (input.consecutiveLatePayments >= 3) {
    const bonusScore = Math.min(10, input.consecutiveLatePayments * 2);
    score += bonusScore;
    factors.push(`${input.consecutiveLatePayments} consecutive late payments`);
    recommendations.push('Escalate to manual follow-up');
  }

  // Cap at 100
  score = Math.min(100, Math.round(score));

  // Determine category
  let category: 'low' | 'medium' | 'high' | 'critical';
  if (score <= 25) {
    category = 'low';
  } else if (score <= 50) {
    category = 'medium';
  } else if (score <= 75) {
    category = 'high';
  } else {
    category = 'critical';
  }

  // Add category-based recommendations
  if (category === 'critical') {
    recommendations.push('Consider placing member on watch list');
    recommendations.push('Review group governance for action plan');
  } else if (category === 'high') {
    recommendations.push('Schedule personal outreach within 48 hours');
  }

  return {
    score,
    category,
    factors: factors.length > 0 ? factors : ['No significant risk factors identified'],
    recommendations: recommendations.length > 0 ? recommendations : ['Continue monitoring'],
  };
};

/**
 * Compute churn probability based on risk score and engagement
 * Returns 0-1 probability
 */
export const computeChurnProbability = (
  riskScore: number,
  recentActivityDays: number,
  missedPaymentCount: number
): number => {
  // Base probability from risk score
  let probability = riskScore / 200; // 0-0.5 base

  // Activity factor
  if (recentActivityDays > 60) {
    probability += 0.3;
  } else if (recentActivityDays > 30) {
    probability += 0.15;
  }

  // Missed payment factor
  probability += missedPaymentCount * 0.1;

  return Math.min(1, Math.max(0, probability));
};

/**
 * Get risk category color for UI
 */
export const getRiskCategoryColor = (category: string): string => {
  switch (category) {
    case 'low':
      return '#2E7D32'; // Green
    case 'medium':
      return '#F57C00'; // Orange
    case 'high':
      return '#D32F2F'; // Red
    case 'critical':
      return '#7B1FA2'; // Purple
    default:
      return '#757575'; // Gray
  }
};
