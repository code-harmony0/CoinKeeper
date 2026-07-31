export function toPaise(amountStr: string): number {
  const cleanStr = amountStr.replace(/,/g, '');
  const parsed = parseFloat(cleanStr);
  if (isNaN(parsed) || parsed <= 0) {
    throw new Error('Invalid amount: must be greater than zero');
  }
  // Math.round handles any tiny float inaccuracies from parsing e.g. 1.05 * 100 = 105.00000000000001
  return Math.round(parsed * 100);
}

export function fromPaise(paise: number): number {
  return paise / 100;
}

export function formatINR(paise: number): string {
  const rupees = paise / 100;
  // Use en-IN locale to get the Indian numbering system (lakhs/crores)
  // and the ₹ symbol
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}
