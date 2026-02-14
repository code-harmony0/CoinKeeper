export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  categoryIcon: string;
  description?: string;
  date: string;
  paymentMethod?: string;
}
