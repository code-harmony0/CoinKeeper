/**
 * Evaluates what a person types into an amount field: "450", "450+120",
 * "1200/4", "99*3-10". A tiny precedence parser instead of eval(), so
 * nothing but arithmetic can ever run.
 *
 * A dangling operator ("450+") is ignored rather than rejected, so the
 * amount stays valid while the person is still typing the next number.
 * Returns null when the text is not arithmetic at all.
 */
const normalise = (input: string): string =>
  input.replace(/[×xX]/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-').replace(/[₹,\s]/g, '');

export const hasOperator = (input: string): boolean => /[+\-*/×÷−x]/i.test(input.replace(/^-/, ''));

export const evaluateAmount = (input: string): number | null => {
  const text = normalise(input).replace(/[+\-*/.]+$/, '');
  if (text === '') return 0;
  if (!/^\d*\.?\d+([+\-*/]\d*\.?\d+)*$|^\d+\.?\d*([+\-*/]\d+\.?\d*)*$/.test(text)) return null;

  const tokens = text.match(/\d*\.?\d+|\d+\.?\d*|[+\-*/]/g) ?? [];
  let pos = 0;

  const term = (): number => {
    let value = Number(tokens[pos++]);
    while (tokens[pos] === '*' || tokens[pos] === '/') {
      const op = tokens[pos++];
      const rhs = Number(tokens[pos++]);
      value = op === '*' ? value * rhs : value / rhs;
    }
    return value;
  };

  let result = term();
  while (pos < tokens.length) {
    const op = tokens[pos++];
    const rhs = term();
    result = op === '+' ? result + rhs : result - rhs;
  }
  if (!Number.isFinite(result) || result < 0) return null;
  return Math.round(result * 100) / 100;
};
