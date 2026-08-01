export type EntrySource = 'manual' | 'sms' | 'scan' | 'recent' | 'favorite' | 'quick_template';
import { IncomeType } from './income';

export interface LineItem {
  description: string;
  amount_paise: number;
}

export interface TransactionDraft {
  id: string;
  type?: 'expense' | 'income'; // default expense usually
  amount_paise?: number;
  merchant_name?: string;
  income_type?: IncomeType;
  income_source_id?: string;
  category_id?: string;
  account_id?: string;
  payment_method?: string;
  date?: string;
  notes?: string;
  confidence?: number;
  source: EntrySource;
  receipt_image_uri?: string;
  sms_id?: string;
  prediction_reason?: string;
  is_recurring_candidate?: boolean;
  is_duplicate?: boolean;
  draft_status: 'editing' | 'reviewing' | 'saving' | 'error';
  // Receipt specific fields
  subtotal_paise?: number;
  tax_paise?: number;
  currency?: string;
  invoice_number?: string;
  line_items?: LineItem[];
}
