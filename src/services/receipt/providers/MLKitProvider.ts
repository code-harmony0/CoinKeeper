import { IReceiptExtractionProvider, ReceiptExtractionResult } from '../IReceiptExtractionProvider';

export class MLKitProvider implements IReceiptExtractionProvider {
  readonly name = 'MLKit';

  async processImage(imageUri: string): Promise<ReceiptExtractionResult> {
    // In a real environment, this invokes the on-device ML Kit OCR module.
    // It is fast and offline but less structured than Vision AI, often requiring 
    // regex processing after text extraction to find Amount and Merchant.
    
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate offline processing

    return {
      merchant_name: 'D-Mart Store',
      amount_paise: 125000, // 1250
      confidence: 70, // Lower confidence due to lack of AI semantic understanding
      date: new Date().toISOString()
      // Notice subtotal, tax, line items might be missing in basic OCR
    };
  }
}
