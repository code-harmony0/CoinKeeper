/**
 * ReportsScreen - Blob Theme
 * Spending/Income reports with blob cards
 */
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Text, Dimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTransactions } from '../../hooks/useTransactions';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronLeft, TrendingUp, TrendingDown } from 'lucide-react-native';
import { THEME_COLORS, THEME_SHADOWS, THEME_RADIUS, THEME_SPACING, THEME_TYPOGRAPHY } from '../../theme/blobTheme';
import { BlobCard } from '../../components/blob/BlobCard';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<any, 'Reports'>;

export const ReportsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { transactions } = useTransactions();
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');

  // Calculate category totals
  const categoryTotals = transactions
    .filter((t) => t.type === activeTab)
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const sortedCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a);

  const total = sortedCategories.reduce((sum, [, amount]) => sum + amount, 0);

  // Calculate totals for summary
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[THEME_COLORS.background, THEME_COLORS.backgroundGradientEnd]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color={THEME_COLORS.textPrimary} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>Reports</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
      >
        {/* Summary Cards */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.summaryRow}>
          <BlobCard style={[styles.summaryCard, { backgroundColor: THEME_COLORS.mint }]}>
            <TrendingUp size={20} color={THEME_COLORS.success} strokeWidth={2} />
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={styles.summaryValue}>₹{totalIncome.toLocaleString('en-IN')}</Text>
          </BlobCard>
          <BlobCard style={[styles.summaryCard, { backgroundColor: THEME_COLORS.peach }]}>
            <TrendingDown size={20} color={THEME_COLORS.errorText} strokeWidth={2} />
            <Text style={styles.summaryLabel}>Expense</Text>
            <Text style={styles.summaryValue}>₹{totalExpense.toLocaleString('en-IN')}</Text>
          </BlobCard>
        </Animated.View>

        {/* Category Breakdown Header */}
        <Animated.View entering={FadeInDown.delay(150)} style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Category Breakdown</Text>
        </Animated.View>

        {/* Toggle */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.toggleContainer}>
          <View style={styles.togglePill}>
            <Pressable
              onPress={() => {
                ReactNativeHapticFeedback.trigger('impactLight');
                setActiveTab('expense');
              }}
              style={[
                styles.toggleButton,
                activeTab === 'expense' && styles.toggleButtonActive,
              ]}
            >
              <Text style={[
                styles.toggleText,
                activeTab === 'expense' && styles.toggleTextActive,
              ]}>
                Spending
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                ReactNativeHapticFeedback.trigger('impactLight');
                setActiveTab('income');
              }}
              style={[
                styles.toggleButton,
                activeTab === 'income' && styles.toggleButtonActive,
              ]}
            >
              <Text style={[
                styles.toggleText,
                activeTab === 'income' && styles.toggleTextActive,
              ]}>
                Income
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Category List */}
        {sortedCategories.length > 0 ? (
          sortedCategories.map(([category, amount], index) => {
            const percentage = total > 0 ? (amount / total) * 100 : 0;
            return (
              <Animated.View
                key={category}
                entering={FadeInDown.delay(250 + index * 50)}
              >
                <BlobCard style={styles.categoryCard}>
                  <View style={styles.categoryRow}>
                    <View style={[styles.categoryIcon, { backgroundColor: getCategoryColor(category) }]}>
                      <Text style={styles.categoryEmoji}>{getCategoryEmoji(category)}</Text>
                    </View>
                    <View style={styles.categoryInfo}>
                      <Text style={styles.categoryName}>{category}</Text>
                      <View style={styles.progressBar}>
                        <View 
                          style={[
                            styles.progressFill, 
                            { width: `${percentage}%`, backgroundColor: getCategoryAccent(category) }
                          ]} 
                        />
                      </View>
                    </View>
                    <View style={styles.categoryAmountContainer}>
                      <Text style={styles.categoryAmount}>
                        ₹{amount.toLocaleString('en-IN')}
                      </Text>
                      <Text style={styles.categoryPercentage}>
                        {percentage.toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                </BlobCard>
              </Animated.View>
            );
          })
        ) : (
          <Animated.View entering={FadeInDown.delay(250)}>
            <BlobCard style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No {activeTab === 'expense' ? 'spending' : 'income'} data yet
              </Text>
            </BlobCard>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
};

// Helper functions
const getCategoryEmoji = (category: string): string => {
  const emojiMap: Record<string, string> = {
    Food: '🍔',
    Transport: '🚗',
    Shopping: '🛍️',
    Bills: '📄',
    Entertainment: '🎬',
    Health: '💊',
    Salary: '💰',
    Freelance: '💻',
    Investment: '📈',
    Others: '📦',
  };
  return emojiMap[category] || '📦';
};

const getCategoryColor = (category: string): string => {
  const colorMap: Record<string, string> = {
    Food: THEME_COLORS.error,
    Transport: THEME_COLORS.accent, // No direct match, using accent
    Shopping: THEME_COLORS.peach, // No direct match, using peach
    Bills: THEME_COLORS.accent, // No direct match, using accent
    Entertainment: THEME_COLORS.lavender, // No direct match, using lavender
    Health: THEME_COLORS.mint, // No direct match, using mint
    Salary: THEME_COLORS.mint,
    Freelance: THEME_COLORS.backgroundGradientEnd,
    Investment: THEME_COLORS.lavender,
    Others: THEME_COLORS.textMuted, // No direct match, using textMuted
  };
  return colorMap[category] || THEME_COLORS.textMuted;
};

const getCategoryAccent = (category: string): string => {
  const accentMap: Record<string, string> = {
    Food: '#FFB347',
    Transport: '#64B5F6',
    Shopping: '#F48FB1',
    Bills: '#FF8A65',
    Entertainment: '#BA68C8',
    Health: '#81C784',
    Salary: THEME_COLORS.success,
    Freelance: THEME_COLORS.accent,
    Investment: THEME_COLORS.lavender, // No direct match, using lavender
    Others: '#90A4AE',
  };
  return accentMap[category] || '#90A4AE';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THEME_SPACING.lg,
    paddingBottom: THEME_SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME_COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...THEME_SHADOWS.card,
  },
  headerTitle: {
    ...THEME_TYPOGRAPHY.h3,
    color: THEME_COLORS.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: THEME_SPACING.xl,
  },
  
  // Summary
  summaryRow: {
    flexDirection: 'row',
    gap: THEME_SPACING.md,
    marginBottom: THEME_SPACING.xl,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'flex-start',
    gap: THEME_SPACING.xs,
  },
  summaryLabel: {
    ...THEME_TYPOGRAPHY.bodySmall,
    color: THEME_COLORS.textSecondary,
  },
  summaryValue: {
    ...THEME_TYPOGRAPHY.h3,
    color: THEME_COLORS.textPrimary,
  },
  
  // Section Header
  sectionHeader: {
    marginBottom: THEME_SPACING.md,
  },
  sectionTitle: {
    ...THEME_TYPOGRAPHY.h3,
    color: THEME_COLORS.textPrimary,
  },
  
  // Toggle
  toggleContainer: {
    marginBottom: THEME_SPACING.lg,
  },
  togglePill: {
    flexDirection: 'row',
    backgroundColor: THEME_COLORS.surface,
    borderRadius: THEME_RADIUS.pill,
    padding: 4,
    ...THEME_SHADOWS.card,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: THEME_SPACING.sm,
    borderRadius: THEME_RADIUS.pill,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: THEME_COLORS.accent,
  },
  toggleText: {
    ...THEME_TYPOGRAPHY.body,
    color: THEME_COLORS.textSecondary,
  },
  toggleTextActive: {
    color: THEME_COLORS.surface,
  },
  
  // Category Card
  categoryCard: {
    marginBottom: THEME_SPACING.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: THEME_SPACING.sm,
  },
  categoryEmoji: {
    fontSize: 20,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    ...THEME_TYPOGRAPHY.body,
    color: THEME_COLORS.textPrimary,
    marginBottom: 6,
  },
  progressBar: {
    height: 6,
    backgroundColor: THEME_COLORS.surfaceTint,
    borderRadius: 3,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  categoryAmountContainer: {
    alignItems: 'flex-end',
    marginLeft: THEME_SPACING.sm,
  },
  categoryAmount: {
    ...THEME_TYPOGRAPHY.body,
    color: THEME_COLORS.textPrimary,
  },
  categoryPercentage: {
    ...THEME_TYPOGRAPHY.bodySmall,
    color: THEME_COLORS.textSecondary,
  },
  
  // Empty
  emptyCard: {
    alignItems: 'center',
    paddingVertical: THEME_SPACING.xxl,
  },
  emptyText: {
    ...THEME_TYPOGRAPHY.body,
    color: THEME_COLORS.textSecondary,
  },
});

export default ReportsScreen;
