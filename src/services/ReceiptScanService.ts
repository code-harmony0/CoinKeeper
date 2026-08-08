import { TransactionDraftService } from './TransactionDraftService';
import { TransactionDraft } from '../types/transactionDraft';
import { IReceiptExtractionProvider, ReceiptExtractionResult } from './receipt/IReceiptExtractionProvider';
import { MLKitProvider } from './receipt/providers/MLKitProvider';
import { getDb } from '../store/database';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

/**
 * ReceiptScanService runs receipt images through on-device OCR (ML Kit) and
 * hydrates a TransactionDraft from the extracted text. Single real provider —
 * no cloud fallback chain, since that would need external API credentials
 * this app doesn't hold.
 */
export const ReceiptScanService = {
  providers: [
    new MLKitProvider(),
  ] as IReceiptExtractionProvider[],

  /**
   * Processes an image through the AI pipeline.
   */
  async processReceiptImage(imageUri: string): Promise<TransactionDraft> {
    let result: ReceiptExtractionResult | null = null;
    let successfulProviderName = '';

    // Pipeline Orchestration
    for (const provider of this.providers) {
      try {
        console.log(`[ReceiptScanService] Attempting extraction with ${provider.name}...`);
        result = await provider.processImage(imageUri);
        
        // If we get here, extraction succeeded
        successfulProviderName = provider.name;
        break;
      } catch (error) {
        console.warn(`[ReceiptScanService] Provider ${provider.name} failed:`, error);
        // Continue to the next provider in the fallback chain
      }
    }

    if (!result) {
      throw new Error('All receipt extraction providers failed.');
    }

    console.log(`[ReceiptScanService] Extraction successful via ${successfulProviderName}. Confidence: ${result.confidence}%`);

    // Log the event to DB (History tracking)
    const db = getDb();
    const receiptId = uuidv4();
    await db.execute(
      `INSERT INTO receipt_history (id, image_uri, raw_text, extracted_merchant, extracted_amount_paise, extracted_date, confidence, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        receiptId,
        imageUri,
        result.raw_text || `Extracted by ${successfulProviderName}`,
        result.merchant_name || null,
        result.amount_paise || null,
        result.date || null,
        result.confidence,
        Date.now()
      ]
    );

    // Hydrate into the shared Draft model
    const draft = TransactionDraftService.createDraft('scan', {
      merchant_name: result.merchant_name,
      amount_paise: result.amount_paise,
      subtotal_paise: result.subtotal_paise,
      tax_paise: result.tax_paise,
      currency: result.currency,
      invoice_number: result.invoice_number,
      line_items: result.line_items,
      date: result.date,
      payment_method: result.payment_method,
      confidence: result.confidence,
      receipt_image_uri: imageUri,
    });

    return draft;
  }
};
