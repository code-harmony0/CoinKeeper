import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../theme';
import { Caption } from '../core/Typography';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', name: 'Food', icon: 'food', color: COLORS.categories.food },
  { id: 'transport', name: 'Transport', icon: 'car', color: COLORS.categories.transport },
  { id: 'shopping', name: 'Shopping', icon: 'shopping', color: COLORS.categories.shopping },
  { id: 'entertainment', name: 'Entertainment', icon: 'gamepad-variant', color: COLORS.categories.entertainment },
  { id: 'bills', name: 'Bills', icon: 'receipt', color: COLORS.categories.bills },
  { id: 'health', name: 'Health', icon: 'medical-bag', color: COLORS.categories.health },
  { id: 'education', name: 'Education', icon: 'book-open-variant', color: COLORS.categories.education },
  { id: 'others', name: 'Others', icon: 'dots-horizontal', color: COLORS.categories.others },
];

interface CategorySelectorProps {
  selectedCategory?: string;
  onSelectCategory: (category: Category) => void;
  categories?: Category[];
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategory,
  onSelectCategory,
  categories = DEFAULT_CATEGORIES,
}) => {
  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((category) => {
          const isSelected = selectedCategory === category.id;
          return (
            <Pressable
              key={category.id}
              onPress={() => onSelectCategory(category)}
              style={[
                styles.categoryButton,
                { backgroundColor: category.color },
                isSelected && styles.selectedCategory,
              ]}
            >
              <Icon 
                name={category.icon} 
                size={24} 
                color={isSelected ? COLORS.surface : COLORS.navyText} 
              />
              <Caption
                style={[
                  styles.categoryText,
                  isSelected ? styles.selectedText : undefined,
                ]}
              >
                {category.name}
              </Caption>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.md,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xs,
  },
  categoryButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.xs / 2,
    alignItems: 'center',
    minWidth: 80,
  },
  selectedCategory: {
    backgroundColor: COLORS.babyBlue,
    borderWidth: 2,
    borderColor: COLORS.navyText,
  },
  categoryText: {
    marginTop: SPACING.xs / 2,
    color: COLORS.navyText,
  },
  selectedText: {
    color: COLORS.surface,
    fontWeight: '600',
  },
});
