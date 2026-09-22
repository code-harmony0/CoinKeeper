import { parseSmsSmart } from '../../src/services/sms/parseSmsSmart';

describe('parseSmsSmart', () => {
  it('uses the rules when they recognise the message', async () => {
    const extractor = jest.fn();

    const result = await parseSmsSmart('Rs.500.00 debited from a/c XX1 to SWIGGY', extractor);

    expect(result).toMatchObject({ amountPaise: 50000, via: 'rules' });
    expect(extractor).not.toHaveBeenCalled();
  });

  it('falls back to the community library before the model', async () => {
    const extractor = jest.fn();

    // Our own patterns do not cover this SBI wording; the library does.
    const result = await parseSmsSmart(
      'Thank you for using SBI Debit Card XX1234 for Rs 999.00 at FLIPKART',
      extractor,
    );

    expect(result).toMatchObject({ type: 'debit', amountPaise: 99900, via: 'library' });
    expect(extractor).not.toHaveBeenCalled();
  });

  it('never lets the library resurrect a message the rules rejected', async () => {
    // The library alone reports this declined payment as a real 500 debit.
    const result = await parseSmsSmart('Payment of Rs 500 to SWIGGY has been declined');

    expect(result).toBeNull();
  });

  it('ranks a library result below our own rules but above the model', async () => {
    const rules = await parseSmsSmart('Rs.500.00 debited from a/c XX1 to SWIGGY');
    const library = await parseSmsSmart(
      'Thank you for using SBI Debit Card XX1234 for Rs 999.00 at FLIPKART',
    );
    const model = await parseSmsSmart('INR 345 applied towards BLINKIT', async () => ({
      amountPaise: 34500,
      merchant: 'BLINKIT',
      type: 'debit' as const,
    }));

    expect(library!.confidence).toBeLessThan(rules!.confidence);
    expect(model!.confidence).toBeLessThan(library!.confidence);
  });

  it('falls back to the model only when neither rules tier recognises the format', async () => {
    const extractor = jest.fn(async () => ({
      amountPaise: 34500,
      merchant: 'BLINKIT',
      type: 'debit' as const,
    }));

    const body = 'INR 345 was applied to your account towards BLINKIT order';
    const result = await parseSmsSmart(body, extractor);

    expect(extractor).toHaveBeenCalledWith(body);
    expect(result).toMatchObject({ amountPaise: 34500, merchant: 'BLINKIT', via: 'model' });
  });

  it('never asks the model about a message the rules deliberately rejected', async () => {
    const extractor = jest.fn();

    const otp = await parseSmsSmart('123456 is your OTP for Rs 500 at AMAZON', extractor);
    const declined = await parseSmsSmart('Payment of Rs 500 to JIO has been declined', extractor);

    expect(otp).toBeNull();
    expect(declined).toBeNull();
    expect(extractor).not.toHaveBeenCalled();
  });

  it('marks a model result as less confident than a rules result', async () => {
    const rules = await parseSmsSmart('Rs.500.00 debited from a/c XX1 to SWIGGY');
    const model = await parseSmsSmart('INR 345 applied towards BLINKIT', async () => ({
      amountPaise: 34500,
      merchant: 'BLINKIT',
      type: 'debit' as const,
    }));

    expect(model!.confidence).toBeLessThan(rules!.confidence);
  });

  it('returns null when the rules miss and no model is available', async () => {
    expect(await parseSmsSmart('INR 345 applied towards BLINKIT')).toBeNull();
  });

  it('returns null when the rules miss and the model also declines', async () => {
    const result = await parseSmsSmart('INR 345 applied towards BLINKIT', async () => null);

    expect(result).toBeNull();
  });

  it('does not spend a model call on a message with no amount in it', async () => {
    const extractor = jest.fn();

    // A real inbox is mostly chatter. Asking a model about every one of those
    // would cost minutes per scan for nothing — there is no transaction in a
    // message that never mentions money.
    const result = await parseSmsSmart('Your parcel is out for delivery today', extractor);

    expect(result).toBeNull();
    expect(extractor).not.toHaveBeenCalled();
  });

  it('still consults the model when an amount is present', async () => {
    const extractor = jest.fn(async () => null);

    await parseSmsSmart('INR 345 applied towards BLINKIT order', extractor);

    expect(extractor).toHaveBeenCalled();
  });

  it('survives the model throwing, rather than breaking the SMS import', async () => {
    const result = await parseSmsSmart('INR 345 applied towards BLINKIT', async () => {
      throw new Error('model not loaded');
    });

    expect(result).toBeNull();
  });
});
