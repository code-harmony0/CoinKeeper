/**
 * useBudget Hook
 * Manages user's monthly budget
 */
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface Budget {
  id: string;
  monthlyLimit: number;
  currentSpent: number;
  month: string; // YYYY-MM
  categories: Record<string, number>;
}

interface BudgetContextType {
  budget: Budget | null;
  isLoading: boolean;
  remaining: number;
  percentUsed: number;
  isOverBudget: boolean;
  daysRemaining: number;
  setBudgetLimit: (amount: number) => void;
  updateSpent: (amount: number) => void;
}

const BudgetContext = createContext<BudgetContextType | null>(null);

export const BudgetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading] = useState(false);
  
  // Current month in YYYY-MM format
  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [budget, setBudget] = useState<Budget | null>({
    id: '1',
    monthlyLimit: 50000,
    currentSpent: 0,
    month: currentMonth,
    categories: {},
  });

  // Computed values
  const remaining = useMemo(() => {
    if (!budget) return 0;
    return budget.monthlyLimit - budget.currentSpent;
  }, [budget]);

  const percentUsed = useMemo(() => {
    if (!budget || budget.monthlyLimit === 0) return 0;
    return Math.min((budget.currentSpent / budget.monthlyLimit) * 100, 100);
  }, [budget]);

  const isOverBudget = remaining < 0;

  const daysRemaining = useMemo(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.getDate() - now.getDate();
  }, []);

  const setBudgetLimit = useCallback((amount: number) => {
    setBudget(prev => prev ? { ...prev, monthlyLimit: amount } : {
      id: '1',
      monthlyLimit: amount,
      currentSpent: 0,
      month: currentMonth,
      categories: {},
    });
  }, [currentMonth]);

  const updateSpent = useCallback((amount: number) => {
    setBudget(prev => prev ? { ...prev, currentSpent: prev.currentSpent + amount } : null);
  }, []);

  return (
    <BudgetContext.Provider value={{
      budget,
      isLoading,
      remaining,
      percentUsed,
      isOverBudget,
      daysRemaining,
      setBudgetLimit,
      updateSpent,
    }}>
      {children}
    </BudgetContext.Provider>
  );
};

export const useBudget = (): BudgetContextType => {
  const context = useContext(BudgetContext);
  if (!context) {
    // Return default values if not wrapped in provider
    return {
      budget: null,
      isLoading: false,
      remaining: 0,
      percentUsed: 0,
      isOverBudget: false,
      daysRemaining: 0,
      setBudgetLimit: () => {},
      updateSpent: () => {},
    };
  }
  return context;
};
