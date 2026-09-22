import {
  buildSmsExtractionPrompt,
  parseExtractionResponse,
  SMS_EXTRACTION_SCHEMA,
} from '../../src/services/llm/smsExtraction';

const SMS = 'Your Card XX9012 was charged Rs 1,250.55 towards SWIGGY on 12-07-26';

describe('buildSmsExtractionPrompt', () => {
  it('includes the message being parsed', () => {
    expect(buildSmsExtractionPrompt(SMS)).toContain(SMS);
  });

  it('tells the model to report a non-transaction rather than guess', () => {
    expect(buildSmsExtractionPrompt(SMS)).toMatch(/is_transaction/);
  });
});

describe('SMS_EXTRACTION_SCHEMA', () => {
  it('constrains direction to the two real values', () => {
    expect(SMS_EXTRACTION_SCHEMA.properties.direction.enum).toEqual(['debit', 'credit']);
  });
});

describe('parseExtractionResponse', () => {
  it('reads a clean JSON extraction', () => {
    const out = parseExtractionResponse(
      '{"is_transaction":true,"amount":"1250.55","merchant":"SWIGGY","direction":"debit"}',
      SMS,
    );

    expect(out).toEqual({ amountPaise: 125055, merchant: 'SWIGGY', type: 'debit' });
  });

  it('tolerates a model that wraps JSON in markdown fences', () => {
    const out = parseExtractionResponse(
      '```json\n{"is_transaction":true,"amount":"1250.55","merchant":"SWIGGY","direction":"debit"}\n```',
      SMS,
    );

    expect(out!.amountPaise).toBe(125055);
  });

  it('tolerates leading prose before the JSON', () => {
    const out = parseExtractionResponse(
      'Sure! Here is the result:\n{"is_transaction":true,"amount":"1250.55","merchant":"SWIGGY","direction":"debit"}',
      SMS,
    );

    expect(out!.amountPaise).toBe(125055);
  });

  it('returns null when the model says it is not a transaction', () => {
    expect(
      parseExtractionResponse('{"is_transaction":false}', SMS),
    ).toBeNull();
  });

  it('returns null on unparseable output', () => {
    expect(parseExtractionResponse('I think it was about 1250 rupees', SMS)).toBeNull();
  });

  it('returns null on empty output', () => {
    expect(parseExtractionResponse('', SMS)).toBeNull();
  });

  it('rejects an amount the model invented that is not in the message', () => {
    const out = parseExtractionResponse(
      '{"is_transaction":true,"amount":"9999.00","merchant":"SWIGGY","direction":"debit"}',
      SMS,
    );

    expect(out).toBeNull();
  });

  it('rejects a direction outside debit and credit', () => {
    const out = parseExtractionResponse(
      '{"is_transaction":true,"amount":"1250.55","merchant":"SWIGGY","direction":"transfer"}',
      SMS,
    );

    expect(out).toBeNull();
  });

  it('rejects a zero or negative amount', () => {
    expect(
      parseExtractionResponse(
        '{"is_transaction":true,"amount":"0","merchant":"X","direction":"debit"}',
        'Rs 0 debited',
      ),
    ).toBeNull();
  });

  it('accepts an amount written without the separators the SMS used', () => {
    const out = parseExtractionResponse(
      '{"is_transaction":true,"amount":"1250.55","merchant":"SWIGGY","direction":"debit"}',
      'Charged Rs 1,250.55 at SWIGGY',
    );

    expect(out!.amountPaise).toBe(125055);
  });

  it('cleans the merchant the same way the regex path does', () => {
    const out = parseExtractionResponse(
      '{"is_transaction":true,"amount":"200","merchant":"VPA zomato@ybl","direction":"debit"}',
      'Rs 200 debited to VPA zomato@ybl',
    );

    expect(out!.merchant).toBe('zomato');
  });

  it('rejects a merchant that is not a string', () => {
    const out = parseExtractionResponse(
      '{"is_transaction":true,"amount":"200","merchant":123,"direction":"debit"}',
      'Rs 200 debited',
    );

    expect(out).toBeNull();
  });
});
