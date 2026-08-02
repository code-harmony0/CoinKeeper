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
