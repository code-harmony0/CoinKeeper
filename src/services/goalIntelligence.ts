import { Goal } from '../store/goalStore';
import { Money } from '../utils/money';

export const computeProgress = (currentAmountPaise: number, targetAmountPaise: number): number => {
  if (targetAmountPaise <= 0) return 0;
  return Math.min(100, Math.round((currentAmountPaise / targetAmountPaise) * 100));
};
