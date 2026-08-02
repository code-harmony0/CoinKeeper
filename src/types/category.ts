export type CategoryHealth = 'healthy' | 'unused' | 'over_budget' | 'attention';

export interface CategoryData {
  id: string;
  name: string;
  icon: string;
  color?: string;
  usageCount: number;
  monthlySpend: number;
  trailingAverageSpend: number;
  topMerchants: string[];
  trend: number[]; // last 6 months, oldest first, rupees
  health: CategoryHealth;
  isUnused: boolean;
}

export interface MergeSuggestion {
  categoryId: string;
  suggestedWithId: string;
  suggestedWithName: string;
  score: number;
}
