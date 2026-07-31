import { toPaise, fromPaise, formatINR } from '../../src/utils/money';

describe('money', () => {
  it('converts rupees to integer paise', () => {
    expect(toPaise('350')).toBe(35000);
    expect(toPaise('350.75')).toBe(35075);
    expect(toPaise('1,23,456.50')).toBe(12345650);
  });

  it('never produces a float', () => {
    expect(Number.isInteger(toPaise('0.1'))).toBe(true);
    expect(toPaise('0.1') + toPaise('0.2')).toBe(toPaise('0.3'));
  });

  it('rejects negative and zero amounts', () => {
    expect(() => toPaise('-5')).toThrow();
    expect(() => toPaise('0')).toThrow();
  });

  it('formats paise in the Indian numbering system', () => {
    expect(formatINR(12345650)).toBe('₹1,23,456.50');
    expect(formatINR(35000)).toBe('₹350.00');
  });

  it('round-trips', () => {
    expect(fromPaise(toPaise('999.99'))).toBe(999.99);
  });
});
