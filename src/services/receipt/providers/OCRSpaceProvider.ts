import { IReceiptExtractionProvider, ReceiptExtractionResult } from '../IReceiptExtractionProvider';

export class OCRSpaceProvider implements IReceiptExtractionProvider {
  readonly name = 'OCR.Space';

  async processImage(imageUri: string): Promise<ReceiptExtractionResult> {
    // In a real environment, this invokes the OCR.Space API as a secondary fallback.
    // It is a cloud-based OCR service that is less intelligent than Gemini but more robust than offline ML Kit for some documents.
    
    await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate API latency

    return {
      merchant_name: 'Unknown Merchant',
      amount_paise: 95000, // 950
      confidence: 60, 
      date: new Date().toISOString()
      // OCR.Space typically returns raw text blobs, so rich extraction might be missing without heavy regex
    };
  }
}
