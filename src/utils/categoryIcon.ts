import * as Icons from 'lucide-react-native';

/**
 * Seeded default categories (migration 002) store MaterialCommunityIcons-style
 * dash-case icon names, not lucide-react-native's PascalCase exports — this
 * maps the known default ids to a matching Lucide icon. Categories created via
 * AddCategorySheet store real Lucide names directly and skip this map entirely.
 */
const DEFAULT_ID_TO_ICON: Record<string, keyof typeof Icons> = {
  food: 'Utensils',
  transport: 'Car',
  shopping: 'ShoppingBag',
  entertainment: 'Film',
  bills: 'Receipt',
  health: 'HeartPulse',
  education: 'BookOpen',
  others: 'MoreHorizontal',
};

/**
 * A fill-up is not a car. Transport covers cabs, trains and fuel alike, so the
 * category icon alone says "car" for a petrol pump — the label is what tells
 * these apart.
 */
const FUEL = /\b(fuel|petrol|diesel|pump|jio-?bp|iocl|hpcl|indian\s?oil|bharat\s?petroleum)\b/i;

export const resolveCategoryIcon = (
  id: string,
  iconName: string | undefined,
  label?: string,
) => {
  if (label && FUEL.test(label)) return Icons.Fuel;
  if (iconName && (Icons as any)[iconName]) {
    return (Icons as any)[iconName];
  }
  const fallbackName = DEFAULT_ID_TO_ICON[id];
  if (fallbackName) {
    return Icons[fallbackName];
  }
  return Icons.MoreHorizontal;
};
