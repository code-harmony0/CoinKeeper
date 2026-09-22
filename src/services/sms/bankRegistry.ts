export interface Bank {
  /** Stable grouping key stored on the transaction. */
  id: string;
  /** What the user sees. */
  name: string;
  /** False when the sender is not a bank we recognise. */
  known: boolean;
}

export const UNKNOWN_BANK = 'UNKNOWN';

/**
 * One institution reaches a phone under many sender IDs. Federal Bank alone
 * arrives as AD-FEDBNK-S, VM-FEDBNK-S, CP-FEDBNK-S and AD-FedFiB-S; SBI splits
 * across SBIUPI, CBSSBI, ATMSBI and SBIBNK. The two-letter prefix is a
 * telecom routing artefact, and the suffix is the message category — neither
 * identifies the bank. Only the middle code does, and several codes can map to
 * the same institution.
 *
 * Matched by substring so channel variants (ATMSBI, CBSSBI) fold into their
 * parent without needing an entry each.
 */
const BANKS: { match: string[]; id: string; name: string }[] = [
  { match: ['FEDBNK', 'FEDFIB'], id: 'FEDERAL', name: 'Federal Bank' },
  { match: ['HDFCBK', 'HDFCBN'], id: 'HDFC', name: 'HDFC Bank' },
  { match: ['SBIUPI', 'CBSSBI', 'ATMSBI', 'SBIBNK', 'SBIINB', 'SBICRD'], id: 'SBI', name: 'State Bank of India' },
  { match: ['ICICIB', 'ICICIT', 'ICICIB'], id: 'ICICI', name: 'ICICI Bank' },
  { match: ['AXISBK', 'AXISBL'], id: 'AXIS', name: 'Axis Bank' },
  { match: ['KOTAKB', 'KOTAKM'], id: 'KOTAK', name: 'Kotak Mahindra Bank' },
  { match: ['PYTMBK', 'PAYTMB', 'PAYTMS'], id: 'PAYTM', name: 'Paytm Payments Bank' },
  { match: ['IDFCFB', 'IDFCBK'], id: 'IDFC', name: 'IDFC First Bank' },
  { match: ['INDUSB', 'INDUSI'], id: 'INDUSIND', name: 'IndusInd Bank' },
  { match: ['YESBNK'], id: 'YES', name: 'Yes Bank' },
  { match: ['PNBSMS', 'PNBBNK'], id: 'PNB', name: 'Punjab National Bank' },
  { match: ['BOBTXN', 'BOBSMS'], id: 'BOB', name: 'Bank of Baroda' },
  { match: ['CANBNK'], id: 'CANARA', name: 'Canara Bank' },
  { match: ['UNIONB'], id: 'UNION', name: 'Union Bank' },
  { match: ['RBLBNK'], id: 'RBL', name: 'RBL Bank' },
  { match: ['AIRTEL', 'AIRINF', 'AIRBIL', 'AIRSBL', 'AIRBNK'], id: 'AIRTEL', name: 'Airtel' },
  { match: ['JIOPAY', 'JIOINF'], id: 'JIO', name: 'Jio' },
  { match: ['AMZNPY', 'AMAZON'], id: 'AMAZONPAY', name: 'Amazon Pay' },
  { match: ['PHONPE', 'PHNPE'], id: 'PHONEPE', name: 'PhonePe' },
];

/**
 * Pulls the institution code out of an Indian sender ID.
 * `AD-FEDBNK-S` → `FEDBNK`, `JX-HDFCBK` → `HDFCBK`, `+919876543210` → the
 * whole string, which simply will not match any bank.
 */
const senderCode = (sender: string): string => {
  const parts = (sender ?? '').trim().toUpperCase().split('-');
  // Two-letter prefixes are routing codes; anything longer is already the code.
  const code = parts.length > 1 && parts[0].length <= 2 ? parts[1] : parts[0];
  return code ?? '';
};

export const resolveBank = (sender: string): Bank => {
  const code = senderCode(sender);
  if (!code) return { id: UNKNOWN_BANK, name: 'Unknown sender', known: false };

  for (const bank of BANKS) {
    if (bank.match.some(m => code.includes(m))) {
      return { id: bank.id, name: bank.name, known: true };
    }
  }

  // Keep the code as its own group. An unrecognised bank is still a bank the
  // user can filter by — discarding it would hide their transactions.
  return { id: code, name: code, known: false };
};
