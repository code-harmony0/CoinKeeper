import { TransactionDraftService } from './TransactionDraftService';
import { TransactionDraft } from '../types/transactionDraft';
import { getDb } from '../store/database';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export interface QuickTemplate {
  id: string;
  title: string;
  amount_paise?: number;
  category_id?: string;
  merchant_name?: string;
}

export const QuickTemplateService = {
  async getTemplates(): Promise<QuickTemplate[]> {
    const db = getDb();
    const result = await db.execute(
      'SELECT id, title, amount_paise, category_id, merchant_name FROM quick_templates ORDER BY created_at DESC'
    );
    return ((result?.rows ?? []) as unknown) as QuickTemplate[];
  },

  async createTemplate(template: Omit<QuickTemplate, 'id'>): Promise<QuickTemplate> {
    const db = getDb();
    const newTemplate: QuickTemplate = {
      id: uuidv4(),
      ...template
    };
    
    await db.execute(
      `INSERT INTO quick_templates (id, title, amount_paise, category_id, merchant_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [newTemplate.id, newTemplate.title, newTemplate.amount_paise ?? null, newTemplate.category_id ?? null, newTemplate.merchant_name ?? null, Date.now()]
    );
    return newTemplate;
  },

  /**
   * Instantiates a TransactionDraft from a template
   */
  async applyTemplate(templateId: string): Promise<TransactionDraft | null> {
    const db = getDb();
    const result = await db.execute('SELECT * FROM quick_templates WHERE id = ?', [templateId]);
    if (!result?.rows || result.rows.length === 0) return null;

    const row = result.rows[0] as any;
    return TransactionDraftService.createDraft('quick_template', {
      amount_paise: row.amount_paise,
      merchant_name: row.merchant_name,
      category_id: row.category_id,
      notes: row.title,
    });
  }
};
