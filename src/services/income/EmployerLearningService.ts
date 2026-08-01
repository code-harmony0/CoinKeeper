import { Transaction as SQLiteTransaction } from '@op-engineering/op-sqlite';
import { v4 as uuidv4 } from 'uuid';

export const EmployerLearningService = {
  /**
   * Matches a raw bank string to a known income source using heuristics.
   */
  async matchSource(tx: SQLiteTransaction, rawString: string): Promise<string | null> {
    const result = await tx.execute(
      'SELECT resolved_source_id FROM employer_learning WHERE raw_string = ?', 
      [rawString.toLowerCase()]
    );
    if (result.rows && result.rows.length > 0) {
      return (result.rows as any)[0].resolved_source_id;
    }
    return null;
  },

  /**
   * Learns a new mapping from manual user entry.
   */
  async learnMapping(tx: SQLiteTransaction, rawString: string, sourceId: string): Promise<void> {
    const raw = rawString.toLowerCase();
    const existing = await tx.execute('SELECT id FROM employer_learning WHERE raw_string = ?', [raw]);
    
    if (existing.rows && existing.rows.length > 0) {
      await tx.execute(
        'UPDATE employer_learning SET resolved_source_id = ?, hit_count = hit_count + 1, updated_at = ? WHERE raw_string = ?',
        [sourceId, Date.now(), raw]
      );
    } else {
      await tx.execute(
        `INSERT INTO employer_learning (id, raw_string, resolved_source_id, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?)`,
        [uuidv4(), raw, sourceId, Date.now(), Date.now()]
      );
    }
  }
};
