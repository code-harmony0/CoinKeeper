import { getDb } from '../store/database';

export interface CategoryMapping {
  merchantPatterns: string[];
  category: string;
}

const DEFAULT_MAPPINGS: CategoryMapping[] = [
  { merchantPatterns: ['swiggy', 'zomato', 'blinkit', 'zepto', 'mcdonald', 'dominos', 'starbucks', 'cafe'], category: 'Food & Dining' },
  { merchantPatterns: ['uber', 'ola', 'rapido', 'namma yatri', 'irctc', 'makemytrip', 'metro'], category: 'Transport' },
  { merchantPatterns: ['amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'dmart', 'reliance'], category: 'Shopping' },
  { merchantPatterns: ['netflix', 'spotify', 'prime', 'hotstar', 'youtube', 'apple', 'google'], category: 'Entertainment' },
  { merchantPatterns: ['airtel', 'jio', 'vi', 'bsnl', 'bescom', 'cesc', 'adani'], category: 'Bills & Utilities' },
  { merchantPatterns: ['apollo', 'pharmeasy', '1mg', 'hospital', 'clinic', 'health'], category: 'Health & Fitness' }
];

export const guessCategory = async (merchantName: string): Promise<string> => {
  if (!merchantName) return 'Other';
  
  const lowerMerchant = merchantName.toLowerCase();
  
  // 1. Check if user has explicitly mapped this merchant in local SQLite
  try {
    const db = getDb();
    const result = await db.execute('SELECT defaultCategory FROM merchants WHERE name = ? COLLATE NOCASE LIMIT 1', [lowerMerchant]);
    
    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0] as { defaultCategory: string };
      if (row.defaultCategory) return row.defaultCategory;
    }
  } catch (e) {
    console.error('Error querying custom merchant category', e);
  }
  
  // 2. Fallback to default regex mappings
  for (const mapping of DEFAULT_MAPPINGS) {
    for (const pattern of mapping.merchantPatterns) {
      if (lowerMerchant.includes(pattern)) {
        return mapping.category;
      }
    }
  }

  return 'Other';
};

export const updateMerchantCategory = async (merchantName: string, newCategory: string) => {
  if (!merchantName) return;
  
  const lowerMerchant = merchantName.toLowerCase();
  try {
    const db = getDb();
    await db.execute(
      'INSERT INTO merchants (id, name, defaultCategory, lastSeen) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET defaultCategory = excluded.defaultCategory',
      [lowerMerchant, lowerMerchant, newCategory, new Date().toISOString()]
    );
  } catch (e) {
    console.error('Error updating merchant category', e);
  }
};
