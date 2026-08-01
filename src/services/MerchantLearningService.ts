import { getDb } from '../store/database';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export interface MerchantLearningEntry {
  id: string;
  merchant_name: string;
  category_id: string;
  confidence: number;
  is_user_verified: boolean;
  updated_at: number;
}

export const MerchantLearningService = {
  /**
   * Normalizes a merchant name (e.g. "UBER *TRIP" -> "uber")
   */
  async normalizeMerchant(rawName: string): Promise<string> {
    if (!rawName) return '';
    const cleanName = rawName.trim().toLowerCase();
    
    const db = getDb();
    // Check aliases
    const result = await db.execute(
      'SELECT normalized_name FROM merchant_aliases WHERE alias = ?',
      [cleanName]
    );

    if (result?.rows && result.rows.length > 0) {
      return (result.rows[0] as any).normalized_name;
    }

    // Basic heuristic cleanup
    return cleanName
      .replace(/[\d*#\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/pvt ltd/g, '')
      .replace(/limited/g, '')
      .trim();
  },

  /**
   * Predicts category and other details based on learned history.
   */
  async predictCategory(merchantName: string): Promise<{ categoryId: string | null; confidence: number }> {
    const db = getDb();
    const normalized = await this.normalizeMerchant(merchantName);
    if (!normalized) return { categoryId: null, confidence: 0 };

    // 1. Check exact map (User created mapping)
    const mapResult = await db.execute(
      'SELECT category_id FROM merchant_category_map WHERE LOWER(merchant) = ?',
      [normalized]
    );

    if (mapResult?.rows && mapResult.rows.length > 0) {
      const row = mapResult.rows[0] as { category_id: string };
      return { categoryId: row.category_id, confidence: 100 };
    }

    // 2. Check learning table for partial matches
    const learnResult = await db.execute(
      'SELECT category_id, confidence FROM merchant_learning WHERE LOWER(merchant_name) LIKE ? ORDER BY confidence DESC LIMIT 1',
      [`%${normalized}%`]
    );

    if (learnResult?.rows && learnResult.rows.length > 0) {
      const row = learnResult.rows[0] as { category_id: string; confidence: number };
      return { categoryId: row.category_id, confidence: row.confidence };
    }

    // 3. Fallback heuristics
    if (normalized.includes('uber') || normalized.includes('ola')) {
      return { categoryId: 'transport', confidence: 80 };
    }
    if (normalized.includes('zomato') || normalized.includes('swiggy')) {
      return { categoryId: 'food', confidence: 80 };
    }

    return { categoryId: null, confidence: 0 };
  },

  /**
   * Called when a user explicitly assigns a category to a merchant.
   */
  async learnCorrection(rawName: string, categoryId: string): Promise<void> {
    const db = getDb();
    const normalized = await this.normalizeMerchant(rawName);
    if (!normalized || !categoryId) return;

    await db.transaction(async tx => {
      // Upsert into map for future exact matches
      await tx.execute(
        `INSERT OR REPLACE INTO merchant_category_map (merchant, category_id, updated_at) 
         VALUES (?, ?, ?)`,
        [normalized, categoryId, Date.now()]
      );

      // Upsert into learning table with 100% confidence
      const existingResult = await tx.execute(
        'SELECT id FROM merchant_learning WHERE LOWER(merchant_name) = ?',
        [normalized]
      );

      if (existingResult?.rows && existingResult.rows.length > 0) {
        const id = (existingResult.rows[0] as any).id;
        await tx.execute(
          `UPDATE merchant_learning SET category_id = ?, confidence = 100, is_user_verified = 1, updated_at = ? WHERE id = ?`,
          [categoryId, Date.now(), id]
        );
      } else {
        await tx.execute(
          `INSERT INTO merchant_learning (id, merchant_name, category_id, confidence, is_user_verified, updated_at) 
           VALUES (?, ?, ?, 100, 1, ?)`,
          [uuidv4(), normalized, categoryId, Date.now()]
        );
      }

      // Add alias if the raw name is different from the normalized name
      const rawClean = rawName.trim().toLowerCase();
      if (rawClean !== normalized) {
        await tx.execute(
          'INSERT OR IGNORE INTO merchant_aliases (id, normalized_name, alias) VALUES (?, ?, ?)',
          [uuidv4(), normalized, rawClean]
        );
      }
    });
  },

  /**
   * Bumps usage count, updates favorites, and adds to recents.
   */
  async updateFrequency(merchantName: string, categoryId: string): Promise<void> {
    const db = getDb();
    const normalized = await this.normalizeMerchant(merchantName);
    if (!normalized) return;
    const now = Date.now();

    await db.transaction(async tx => {
      // 1. Favorites
      const existingFav = await tx.execute(
        'SELECT id, use_count FROM favorite_merchants WHERE LOWER(merchant_name) = ?',
        [normalized]
      );

      if (existingFav?.rows && existingFav.rows.length > 0) {
        const row = existingFav.rows[0] as { id: string; use_count: number };
        await tx.execute(
          'UPDATE favorite_merchants SET use_count = ?, last_used_at = ?, category_id = ? WHERE id = ?',
          [row.use_count + 1, now, categoryId, row.id]
        );
      } else {
        await tx.execute(
          `INSERT INTO favorite_merchants (id, merchant_name, category_id, use_count, last_used_at) 
           VALUES (?, ?, ?, 1, ?)`,
          [uuidv4(), normalized, categoryId, now]
        );
      }

      // 2. Recents
      await tx.execute(
        'DELETE FROM recent_merchants WHERE LOWER(merchant_name) = ?',
        [normalized]
      );
      await tx.execute(
        `INSERT INTO recent_merchants (id, merchant_name, category_id, last_used_at) VALUES (?, ?, ?, ?)`,
        [uuidv4(), normalized, categoryId, now]
      );
    });
  },

  async getFavorites(limit: number = 5): Promise<{ merchant_name: string; category_id: string }[]> {
    const db = getDb();
    const result = await db.execute(
      'SELECT merchant_name, category_id FROM favorite_merchants ORDER BY use_count DESC, last_used_at DESC LIMIT ?',
      [limit]
    );
    return ((result?.rows ?? []) as unknown) as { merchant_name: string; category_id: string }[];
  },

  async getRecent(limit: number = 10): Promise<{ merchant_name: string; category_id: string }[]> {
    const db = getDb();
    const result = await db.execute(
      'SELECT merchant_name, category_id FROM recent_merchants ORDER BY last_used_at DESC LIMIT ?',
      [limit]
    );
    return ((result?.rows ?? []) as unknown) as { merchant_name: string; category_id: string }[];
  }
};
