import { IReceiptExtractionProvider, ReceiptExtractionResult } from '../IReceiptExtractionProvider';

export class GeminiVisionProvider implements IReceiptExtractionProvider {
  readonly name = 'GeminiVision';

  async processImage(imageUri: string): Promise<ReceiptExtractionResult> {
    // In a real environment, we would upload the imageUri to Gemini Vision API
    // and parse the structured JSON response.
    // We simulate a high-quality AI extraction here.
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API latency

    return {
      merchant_name: 'Whole Foods Market',
      amount_paise: 345000, // 3450
      subtotal_paise: 320000,
      tax_paise: 25000,
      currency: 'INR',
      date: new Date().toISOString(),
      payment_method: 'VISA-4012',
      invoice_number: 'INV-WF-90210',
      line_items: [
        { description: 'Organic Avocados (4)', amount_paise: 50000 },
        { description: 'Almond Milk 1L', amount_paise: 25000 },
        { description: 'Wild Caught Salmon', amount_paise: 120000 },
        { description: 'Sourdough Bread', amount_paise: 15000 },
        { description: 'Roasted Almonds', amount_paise: 110000 }
      ],
      confidence: 95
    };
  }
}
