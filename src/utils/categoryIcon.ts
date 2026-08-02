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

export const resolveCategoryIcon = (id: string, iconName: string | undefined) => {
  if (iconName && (Icons as any)[iconName]) {
    return (Icons as any)[iconName];
  }
  const fallbackName = DEFAULT_ID_TO_ICON[id];
  if (fallbackName) {
    return Icons[fallbackName];
  }
  return Icons.MoreHorizontal;
};
