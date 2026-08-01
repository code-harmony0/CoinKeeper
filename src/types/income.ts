export type IncomeType = 
  | 'salary' | 'freelance' | 'business' | 'bonus' | 'commission' 
  | 'dividend' | 'interest' | 'rental' | 'investment' | 'cashback' 
  | 'refund' | 'gift' | 'government' | 'tax_refund' | 'transfer' 
  | 'loan' | 'other';

export type IncomeAccountType = 'cash' | 'bank' | 'wallet' | 'upi' | 'credit_settlement' | 'investment';

export interface IncomeAccount {
  id: string;
  name: string;
  account_type: IncomeAccountType;
  balance_paise: number;
}

export interface IncomeSource {
  id: string;
  name: string;
  source_type: string;
  confidence_score: number;
}

export type IncomeRuleType = 'fixed' | 'percentage' | 'remaining' | 'priority' | 'threshold_skip';
export type IncomeDestinationType = 'goal' | 'bill' | 'budget' | 'safe_to_spend';

export interface IncomeRule {
  id: string;
  source_id: string | null; // null = global
  rule_type: IncomeRuleType;
  destination_type: IncomeDestinationType;
  destination_id: string | null;
  value: number; // percentage * 100 or fixed paise
  priority_order: number;
  threshold_paise: number;
  is_active: boolean;
}

export interface IncomeAllocation {
  id: string;
  transaction_id: string;
  rule_id: string;
  destination_type: IncomeDestinationType;
  destination_id: string | null;
  allocated_amount_paise: number;
}

export interface IncomeInsight {
  id: string;
  insight_type: string;
  title: string;
  description: string;
  severity: 'info' | 'success' | 'warning' | 'danger';
  is_read: boolean;
  created_at: number;
}

export interface IncomeForecast {
  id: string;
  forecast_month: string;
  total_expected_paise: number;
  safe_to_spend_projected_paise: number;
}

export interface IncomePrediction {
  id: string;
  source_id: string;
  predicted_date: string;
  predicted_amount_paise: number;
  confidence_score: number;
  prediction_reason?: string;
}
