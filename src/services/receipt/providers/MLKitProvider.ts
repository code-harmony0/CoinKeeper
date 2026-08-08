import TextRecognition from '@react-native-ml-kit/text-recognition';
import { IReceiptExtractionProvider, ReceiptExtractionResult } from '../IReceiptExtractionProvider';
import { parseReceiptText } from '../receiptTextParser';

// Real on-device OCR via Google ML Kit's Text Recognition — no network call,
// no API key, works offline. Structured fields (merchant/amount/date) are then
// heuristically extracted from the recognized text in receiptTextParser.ts.
export class MLKitProvider implements IReceiptExtractionProvider {
  readonly name = 'MLKit';

  async processImage(imageUri: string): Promise<ReceiptExtractionResult> {
    const result = await TextRecognition.recognize(imageUri);

    if (!result.text || result.text.trim().length === 0) {
      throw new Error('No text detected on the receipt.');
    }

    const parsed = parseReceiptText(result.text);

    return {
      merchant_name: parsed.merchant_name,
      amount_paise: parsed.amount_paise,
      currency: 'INR',
      date: parsed.date,
      confidence: parsed.confidence,
      raw_text: result.text,
    };
  }
}
