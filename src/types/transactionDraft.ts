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
  /**
   * How the message was read: our own patterns, the bundled parser library, or
   * the on-device model. Shown on the row, because "was this AI or not?" is a
   * question about *this* transaction, not a setting buried in a menu.
   */
  parse_route?: 'rules' | 'library' | 'model';
  source: EntrySource;
  receipt_image_uri?: string;
  sms_id?: string;
  /** Grouping key from the SMS sender, e.g. 'FEDERAL'. See bankRegistry. */
  bank_id?: string;
  /** Display name for bank_id, e.g. 'Federal Bank'. */
  bank_name?: string;
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
