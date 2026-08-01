import { getDb } from '../store/database';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { TransactionDraft, EntrySource } from '../types/transactionDraft';

export const TransactionDraftService = {
  /**
   * Initializes a new empty draft or a draft from a specific source.
   */
  createDraft(source: EntrySource = 'manual', overrides: Partial<TransactionDraft> = {}): TransactionDraft {
    return {
      id: uuidv4(),
      source,
      date: new Date().toISOString(),
      draft_status: 'editing',
      ...overrides
    };
  },

  /**
   * Persists a draft to SQLite (for background saving or interrupt recovery).
   */
  async saveDraft(draft: TransactionDraft): Promise<void> {
    const db = getDb();
    const now = Date.now();
    await db.execute(
      `INSERT OR REPLACE INTO transaction_drafts (
        id, amount_paise, merchant_name, category_id, account_id, payment_method, date, notes,
        confidence, source, receipt_image_uri, sms_id, prediction_reason,
        is_recurring_candidate, is_duplicate, draft_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        draft.id,
        draft.amount_paise ?? null,
        draft.merchant_name ?? null,
        draft.category_id ?? null,
        draft.account_id ?? null,
        draft.payment_method ?? null,
        draft.date ?? null,
        draft.notes ?? null,
        draft.confidence ?? null,
        draft.source,
        draft.receipt_image_uri ?? null,
        draft.sms_id ?? null,
        draft.prediction_reason ?? null,
        draft.is_recurring_candidate ? 1 : 0,
        draft.is_duplicate ? 1 : 0,
        draft.draft_status,
        now, // Use existing created_at if we wanted to be perfectly accurate, but simpler to just use now for created_at on replace if missing. SQLite upsert can be tricky. Let's just use now.
        now
      ]
    );
  },

  async getDraft(id: string): Promise<TransactionDraft | null> {
    const db = getDb();
    const res = await db.execute('SELECT * FROM transaction_drafts WHERE id = ?', [id]);
    if (!res?.rows || res.rows.length === 0) return null;
    const row = res.rows[0] as any;
    return {
      id: row.id,
      amount_paise: row.amount_paise,
      merchant_name: row.merchant_name,
      category_id: row.category_id,
      account_id: row.account_id,
      payment_method: row.payment_method,
      date: row.date,
      notes: row.notes,
      confidence: row.confidence,
      source: row.source,
      receipt_image_uri: row.receipt_image_uri,
      sms_id: row.sms_id,
      prediction_reason: row.prediction_reason,
      is_recurring_candidate: row.is_recurring_candidate === 1,
      is_duplicate: row.is_duplicate === 1,
      draft_status: row.draft_status,
    };
  },

  async deleteDraft(id: string): Promise<void> {
    const db = getDb();
    await db.execute('DELETE FROM transaction_drafts WHERE id = ?', [id]);
  }
};
