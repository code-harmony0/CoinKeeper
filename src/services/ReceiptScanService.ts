import { TransactionDraftService } from './TransactionDraftService';
import { TransactionDraft } from '../types/transactionDraft';
import { IReceiptExtractionProvider, ReceiptExtractionResult } from './receipt/IReceiptExtractionProvider';
import { GeminiVisionProvider } from './receipt/providers/GeminiVisionProvider';
import { MLKitProvider } from './receipt/providers/MLKitProvider';
import { OCRSpaceProvider } from './receipt/providers/OCRSpaceProvider';
import { getDb } from '../store/database';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

/**
 * ReceiptScanService orchestrates the AI pipeline for receipt ingestion.
 * It tries providers in a fallback sequence (e.g. Gemini Vision -> ML Kit)
 * and hydrates a rich TransactionDraft.
 */
export const ReceiptScanService = {
  // Ordered array of providers. Primary first, offline fallbacks last.
  providers: [
    new GeminiVisionProvider(),
    new MLKitProvider(),
    new OCRSpaceProvider()
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
        `Extracted by ${successfulProviderName}`, // Normally raw text, but simplified for the mock
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
