import * as Icons from 'lucide-react-native';
import { resolveCategoryIcon } from '../../src/utils/categoryIcon';

describe('resolveCategoryIcon', () => {
  it('gives a fuel stop its own icon rather than Transport\'s car', () => {
    expect(resolveCategoryIcon('transport', 'Car', 'Jio-bp Pump')).toBe(Icons.Fuel);
    expect(resolveCategoryIcon('transport', 'Car', 'HP PETROL PUMP')).toBe(Icons.Fuel);
  });

  it('leaves the rest of Transport alone', () => {
    expect(resolveCategoryIcon('transport', 'Car', 'Uber ride')).toBe(Icons.Car);
  });

  it('still honours an explicit icon when nothing says fuel', () => {
    expect(resolveCategoryIcon('food', 'Utensils', 'Swiggy')).toBe(Icons.Utensils);
  });

  it('falls back by category id, then to a neutral icon', () => {
    expect(resolveCategoryIcon('bills', undefined)).toBe(Icons.Receipt);
    expect(resolveCategoryIcon('nope', undefined)).toBe(Icons.MoreHorizontal);
  });
});
