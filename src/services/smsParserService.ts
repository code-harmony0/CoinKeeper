import { PermissionsAndroid, Platform } from 'react-native';
import SmsAndroid from 'react-native-get-sms-android'; // Assuming this library is used for SMS access
import { transactionService } from './transactionService';
import { Transaction } from '../types/transaction';
import { firestore } from '@react-native-firebase/firestore';

// --- SMS Parsing Rules ---
// Define regex patterns to extract amount, merchant, and transaction type.
// These are examples and should be refined based on common bank SMS formats.
const SMS_PATTERNS = {
  // Pattern 1: Amount debited/spent from account
  debited: [
    /Rs\.? ?(\d[\d,]*\.?\d{0,2}) debited from your (?:A\/c|account) (?:XXXXXX\d+)? for (?:(?:Txn|payment) to|purchase at|transfer to|bill payment of) ([\w\s\.]+)/i,
    /You spent Rs\.? ?(\d[\d,]*\.?\d{0,2}) at ([\w\s\.]+)/i,
    /Rs\.? ?(\d[\d,]*\.?\d{0,2}) has been debited from your account(?: on| for)? ([\w\s\.]+)/i,
    /INR ?(\d[\d,]*\.?\d{0,2}) debited (?:from|to) ([\w\s\.]+)/i,
  ],
  // Pattern 2: Amount credited to account
  credited: [
    /Rs\.? ?(\d[\d,]*\.?\d{0,2}) has been credited to your (?:A\/c|account) (?:XXXXXX\d+)?(?: by| from)? ([\w\s\.]+)?/i,
    /INR ?(\d[\d,]*\.?\d{0,2}) credited (?:from|by) ([\w\s\.]+)/i,
  ],
  // Pattern 3: Card transaction (often debited)
  cardTransaction: [
    /Rs\.? ?(\d[\d,]*\.?\d{0,2}) spent on your (?:Debit|Credit) Card (?:XXXXXX\d+)? at ([\w\s\.]+)/i,
    /INR ?(\d[\d,]*\.?\d{0,2}) was spent (?:on|by) your (?:Debit|Credit) card(?: XXXXXX\d+)?(?: at)? ([\w\s\.]+)/i,
  ],
};

// --- Helper to clean and parse amount ---
const parseAmount = (amountStr: string): number => {
  return parseFloat(amountStr.replace(/,/g, ''));
};

export const smsParserService = {
  /**
   * Requests SMS read permission from the user.
   * @returns Promise<boolean> - true if permission is granted, false otherwise.
   */
  requestReadSmsPermission: async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_SMS,
          {
            title: 'CoinKeeper SMS Permission',
            message: 'CoinKeeper needs access to your SMS to auto-track expenses.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.results.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    // iOS does not allow programmatic access to SMS
    return false;
  },

  /**
   * Filters for bank messages based on common keywords.
   * @param message - The SMS message content.
   * @returns boolean - true if likely a bank message, false otherwise.
   */
  isBankMessage: (message: string): boolean => {
    const bankKeywords = ['debited', 'credited', 'spent', 'transaction', 'OTP', 'bank', 'account', 'card', 'INR', 'Rs'];
    return bankKeywords.some(keyword => message.toLowerCase().includes(keyword.toLowerCase()));
  },

  /**
   * Extracts transaction details from a message using regex patterns.
   * @param message - The SMS message content.
   * @returns Partial<Transaction> | null - Parsed details or null if no match.
   */
  extractTransactionDetails: (message: string): Partial<Transaction & { date?: string }> | null => {
    let transactionType: 'expense' | 'income' = 'expense';
    let amount: number | null = null;
    let merchant: string | null = null;
    let category: string = 'Uncategorized'; // Default category

    // Try to match debited patterns
    for (const pattern of SMS_PATTERNS.debited) {
      const match = message.match(pattern);
      if (match) {
        amount = parseAmount(match[1]);
        merchant = match[2]?.trim() || 'Unknown Merchant';
        transactionType = 'expense';
        // Simple category inference based on common keywords
        if (merchant.toLowerCase().includes('swiggy') || merchant.toLowerCase().includes('zomato')) category = 'Food';
        else if (merchant.toLowerCase().includes('amazon') || merchant.toLowerCase().includes('flipkart')) category = 'Shopping';
        else if (merchant.toLowerCase().includes('uber') || merchant.toLowerCase().includes('ola')) category = 'Transport';
        return { amount, type: transactionType, category, description: message, merchant };
      }
    }

    // Try to match credited patterns
    for (const pattern of SMS_PATTERNS.credited) {
      const match = message.match(pattern);
      if (match) {
        amount = parseAmount(match[1]);
        merchant = match[2]?.trim() || 'Sender'; // Credited from
        transactionType = 'income';
        category = 'Income';
        return { amount, type: transactionType, category, description: message, merchant };
      }
    }

    // Try to match card transaction patterns (if not already matched by debited)
    for (const pattern of SMS_PATTERNS.cardTransaction) {
      const match = message.match(pattern);
      if (match) {
        amount = parseAmount(match[1]);
        merchant = match[2]?.trim() || 'Unknown Merchant';
        transactionType = 'expense'; // Card transactions are typically expenses
        return { amount, type: transactionType, category, description: message, merchant };
      }
    }

    return null;
  },

  /**
   * Reads SMS messages from the device (Android only).
   * @param userId - The ID of the current user for auto-creating transactions.
   * @returns Promise<Transaction[]> - An array of parsed transactions.
   */
  readAndParseSms: async (userId: string): Promise<Transaction[]> => {
    if (Platform.OS !== 'android') {
      console.warn('SMS reading is only supported on Android.');
      return [];
    }

    const hasPermission = await smsParserService.requestReadSmsPermission();
    if (!hasPermission) {
      throw new Error('SMS read permission not granted.');
    }

    return new Promise((resolve, reject) => {
      SmsAndroid.list(
        JSON.stringify({ box: 'inbox' }), // Filter options
        (fail: any) => {
          console.log('Failed to list SMS:', fail);
          reject(new Error('Failed to list SMS.'));
        },
        async (count: number, smsListJson: string) => {
          try {
            const arr = JSON.parse(smsListJson);
            const parsedTransactions: Transaction[] = [];

            for (let i = 0; i < arr.length; i++) {
              const sms = arr[i];
              if (smsParserService.isBankMessage(sms.body)) {
                const details = smsParserService.extractTransactionDetails(sms.body);
                if (details && details.amount) {
                  // Prevent duplicates - basic check: hash of message or timestamp + amount
                  // A more robust solution would involve storing a hash of parsed messages or transaction IDs.
                  const transactionDate = firestore.Timestamp.fromMillis(sms.date).toDate().toISOString();

                  const newTransaction: Omit<Transaction, 'id'> = {
                    amount: details.amount,
                    type: details.type || 'expense',
                    category: details.category || 'Uncategorized',
                    categoryIcon: details.type === 'income' ? 'cash' : 'shopping-bag', // Default icons
                    description: details.description || sms.body,
                    date: transactionDate,
                    paymentMethod: 'SMS Auto',
                    userId: userId, // Link to the current user
                  };

                  // TODO: Implement duplicate check against existing Firestore transactions
                  // For now, let's just add it. User confirmation logic will be important.
                  // const isDuplicate = await transactionService.checkDuplicate(newTransaction);
                  // if (!isDuplicate) {
                  //   parsedTransactions.push(await transactionService.addTransaction(newTransaction));
                  // }

                  parsedTransactions.push(newTransaction as Transaction); // Push to list for confirmation

                }
              }
            }
            resolve(parsedTransactions);
          } catch (e) {
            console.error('Error parsing SMS list:', e);
            reject(new Error('Error parsing SMS list.'));
          }
        }
      );
    });
  },

  /**
   * Optional: Auto-create transaction after parsing (requires user confirmation logic).
   * @param transactionData The parsed transaction data.
   * @returns Promise<Transaction> The created transaction.
   */
  autoCreateTransaction: async (transactionData: Omit<Transaction, 'id'>): Promise<Transaction> => {
    // This function would typically be called after user confirmation or
    // after a duplicate check.
    return transactionService.addTransaction(transactionData);
  },
};
