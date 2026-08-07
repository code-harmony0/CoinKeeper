export const Money = {
  toPaise: (amountStr: string | number): number => {
    if (!amountStr) return 0;
    const cleanStr = String(amountStr).replace(/,/g, '');
    const parsed = parseFloat(cleanStr);
    if (isNaN(parsed) || parsed < 0) {
      return 0; // Return 0 instead of throwing to prevent UI crashes
    }
    // Math.round handles any tiny float inaccuracies from parsing e.g. 1.05 * 100 = 105.00000000000001
    return Math.round(parsed * 100);
  },
  
  toRupees: (paise: number): number => {
    return paise / 100;
  },
  
  format: (paise: number, options?: { hideSymbol?: boolean, zeroDecimals?: boolean }): string => {
    const rupees = paise / 100;
    return new Intl.NumberFormat('en-IN', {
      style: options?.hideSymbol ? 'decimal' : 'currency',
      currency: 'INR',
      minimumFractionDigits: options?.zeroDecimals ? 0 : 2,
      maximumFractionDigits: options?.zeroDecimals ? 0 : 2,
    }).format(rupees);
  },
  
  safeRound: (value: number): number => {
    return Math.round(value);
  },
  
  percentage: (partPaise: number, totalPaise: number): number => {
    if (totalPaise === 0) return 0;
    return Math.round((partPaise / totalPaise) * 100);
  }
};

// Legacy exports for backwards compatibility during refactor
export const toPaise = (amountStr: string): number => {
  const cleanStr = amountStr.replace(/,/g, '');
  const parsed = parseFloat(cleanStr);
  if (isNaN(parsed) || parsed <= 0) {
    throw new Error('Invalid amount: must be greater than zero');
  }
  return Math.round(parsed * 100);
};

export const fromPaise = (paise: number): number => Money.toRupees(paise);

export const formatINR = (paise: number): string => Money.format(paise);
