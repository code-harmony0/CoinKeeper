export interface MoneyPlanScoreInput {
  income: number;
  needsPercent: number;
  wantsPercent: number;
  savingsPercent: number;
  /** true = goal has progress, false = goal exists but stalled, null = no Emergency Fund goal set up */
  emergencyFundStarted: boolean | null;
}

export interface MoneyPlanScoreResult {
  hasIncome: boolean;
  score: number;
  recommendations: string[];
}

const NEEDS_RANGE: [number, number] = [50, 60];
const WANTS_RANGE: [number, number] = [20, 30];
const MIN_SAVINGS_PERCENT = 20;

/**
 * Score is (criteria met / criteria applicable) × 100 — every criterion maps
 * to a real, currently-computable fact, never a vibe. The Emergency Fund
 * criterion only applies once the user has actually created that goal;
 * otherwise it would silently cap everyone's score at 80.
 */
export const computeMoneyPlanScore = (input: MoneyPlanScoreInput): MoneyPlanScoreResult => {
  if (input.income <= 0) {
    return {
      hasIncome: false,
      score: 0,
      recommendations: ['Add your monthly income to calculate your Money Plan Score.'],
    };
  }

  const criteria: { met: boolean; recommendation: string }[] = [
    {
      met: input.needsPercent >= NEEDS_RANGE[0] && input.needsPercent <= NEEDS_RANGE[1],
      recommendation: `Adjust Needs into the ${NEEDS_RANGE[0]}-${NEEDS_RANGE[1]}% range.`,
    },
    {
      met: input.wantsPercent >= WANTS_RANGE[0] && input.wantsPercent <= WANTS_RANGE[1],
      recommendation: `Adjust Wants into the ${WANTS_RANGE[0]}-${WANTS_RANGE[1]}% range.`,
    },
    {
      met: input.savingsPercent >= MIN_SAVINGS_PERCENT,
      recommendation: `Increase Savings to at least ${MIN_SAVINGS_PERCENT}%.`,
    },
    {
      met: input.needsPercent + input.wantsPercent + input.savingsPercent === 100,
      recommendation: 'Balance your allocation so it adds up to 100%.',
    },
  ];

  if (input.emergencyFundStarted !== null) {
    criteria.push({
      met: input.emergencyFundStarted,
      recommendation: 'Start contributing to your Emergency Fund goal.',
    });
  }

  const met = criteria.filter(c => c.met).length;
  const score = Math.round((met / criteria.length) * 100);

  return {
    hasIncome: true,
    score,
    recommendations: criteria.filter(c => !c.met).map(c => c.recommendation),
  };
};

export interface PresetOutcomeInput {
  income: number;
  needsPercent: number;
  wantsPercent: number;
  savingsPercent: number;
}

export interface PresetOutcome {
  safeToSpend: number;
  monthlySavings: number;
  emergencyFundMonths: number | null;
}

const EMERGENCY_FUND_TARGET = 100000;

export const computePresetOutcome = (input: PresetOutcomeInput): PresetOutcome => {
  const monthlySavings = Math.round(input.income * (input.savingsPercent / 100));
  return {
    safeToSpend: Math.round(input.income * ((input.needsPercent + input.wantsPercent) / 100)),
    monthlySavings,
    emergencyFundMonths: monthlySavings > 0 ? Math.ceil(EMERGENCY_FUND_TARGET / monthlySavings) : null,
  };
};

export interface ProjectionInput {
  income: number;
  savingsPercent: number;
  months: number[];
}

export interface ProjectionPoint {
  months: number;
  cumulativeSavings: number;
}

export const computeProjection = (input: ProjectionInput): ProjectionPoint[] => {
  const monthlySavings = Math.round(input.income * (input.savingsPercent / 100));
  return input.months.map(months => ({ months, cumulativeSavings: monthlySavings * months }));
};

export interface BucketTrend {
  direction: 'up' | 'down' | 'flat';
  pct: number;
}

const TREND_FLAT_THRESHOLD_PCT = 2;

/**
 * previousSpend <= 0 short-circuits to flat rather than treating any spend as an
 * infinite increase — there's no meaningful "trend" when there's nothing to compare against.
 */
export const computeBucketTrend = (currentSpend: number, previousSpend: number): BucketTrend => {
  if (previousSpend <= 0) return { direction: 'flat', pct: 0 };
  const pct = Math.round(((currentSpend - previousSpend) / previousSpend) * 100);
  if (pct > TREND_FLAT_THRESHOLD_PCT) return { direction: 'up', pct };
  if (pct < -TREND_FLAT_THRESHOLD_PCT) return { direction: 'down', pct };
  return { direction: 'flat', pct };
};

export interface EmergencyFundReadinessInput {
  target: number;
  current: number;
  monthlySavings: number;
}

export interface EmergencyFundReadiness {
  remaining: number;
  label: string;
}

/**
 * monthlySavings <= 0 has no meaningful "ready in N months" — there's nothing
 * accruing toward the target, so we surface a prompt to start saving instead.
 */
export const computeEmergencyFundReadiness = (input: EmergencyFundReadinessInput): EmergencyFundReadiness => {
  const remaining = Math.max(0, input.target - input.current);
  const label = input.monthlySavings > 0 ? `Ready in ${Math.ceil(remaining / input.monthlySavings)} mos` : 'Add savings to start';
  return { remaining, label };
};

export interface PaceInput {
  spendSoFar: number;
  daysElapsed: number;
  daysInMonth: number;
  budget: number;
}

export interface PacePrediction {
  projectedTotal: number;
  onTrack: boolean;
}

export const predictBucketPace = (input: PaceInput): PacePrediction => {
  const projectedTotal = input.daysElapsed > 0 ? Math.round((input.spendSoFar / input.daysElapsed) * input.daysInMonth) : 0;
  return { projectedTotal, onTrack: projectedTotal <= input.budget };
};
