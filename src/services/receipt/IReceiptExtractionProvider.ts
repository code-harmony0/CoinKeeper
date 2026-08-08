import { LineItem } from '../../types/transactionDraft';

export interface ReceiptExtractionResult {
  merchant_name?: string;
  amount_paise?: number;
  subtotal_paise?: number;
  tax_paise?: number;
  currency?: string;
  date?: string;
  payment_method?: string;
  invoice_number?: string;
  line_items?: LineItem[];
  confidence: number;
  /** Full recognized text, kept for the receipt history log and manual review. */
  raw_text?: string;
}

export interface IReceiptExtractionProvider {
  /**
   * The name of the provider (e.g., 'MLKit')
   */
  readonly name: string;

  /**
   * Processes an image and attempts to extract structured receipt data.
   * Throws an error if extraction completely fails.
   */
  processImage(imageUri: string): Promise<ReceiptExtractionResult>;
}
