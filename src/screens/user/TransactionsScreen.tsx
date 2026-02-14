/**
 * TransactionsScreen - Premium Blob Design
 * NO EMOJI - Thin-stroke SVG icons only
 */
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Text } from 'react-native';
import Animated, { FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTransactions } from '../../hooks/useTransactions';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { THEME_COLORS, THEME_SHADOWS, THEME_RADIUS, THEME_SPACING, THEME_TYPOGRAPHY, THEME_ANIMATION } from '../../theme/blobTheme';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

type Props = NativeStackScreenProps<any, 'Transactions'>;

export const TransactionsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { transactions } = useTransactions();
  const [activeTab, setActiveTab] = useState<'all' | 'income' | 'expense'>('all');

  const filteredTx = activeTab === 'all' ? transactions : transactions.filter(t => t.type === activeTab);
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#C8E0F4', '#D8EAF8', '#ECF3FB']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <BackIcon />
        </Pressable>
        <Text style={styles.headerTitle}>Transactions</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Summary blobs */}
      <Animated.View entering={FadeInDown.delay(50)} style={styles.summaryRow}>
        <View style={[styles.summaryBlob, { backgroundColor: '#ECFDF5' }]}>
          <IncomeIcon />
          <View>
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={styles.summaryValue}>₹{totalIncome.toLocaleString('en-IN')}</Text>
          </View>
        </View>
        <View style={[styles.summaryBlob, { backgroundColor: '#FDF2F8' }]}>
          <ExpenseIcon />
          <View>
            <Text style={styles.summaryLabel}>Expenses</Text>
            <Text style={styles.summaryValue}>₹{totalExpense.toLocaleString('en-IN')}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Filter toggle */}
      <Animated.View entering={FadeInDown.delay(100)} style={styles.toggleContainer}>
        <View style={styles.toggleBlob}>
          {(['all', 'income', 'expense'] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => { ReactNativeHapticFeedback.trigger('impactLight'); setActiveTab(tab); }}
              style={[styles.toggleItem, activeTab === tab && styles.toggleItemActive]}
            >
              <Text style={[styles.toggleText, activeTab === tab && styles.toggleTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>

      {/* Transaction list */}
      <View style={styles.listContainer}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 120, paddingHorizontal: 20, paddingTop: 20 }}>
          {filteredTx.length > 0 ? (
            filteredTx.map((tx, i) => (
              <Animated.View key={tx.id} entering={FadeInUp.delay(150 + i * 30)}>
                <View style={[styles.txCard, i < filteredTx.length - 1 && styles.txCardBorder]}>
                  <View style={[styles.txIcon, { backgroundColor: getCategoryColor(tx.category) }]}>
                    <CategoryIcon category={tx.category} />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txTitle}>{tx.description}</Text>
                    <Text style={styles.txMeta}>{tx.category}</Text>
                  </View>
                  <Text style={[styles.txAmount, tx.type === 'income' && styles.txAmountGreen]}>
                    {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                  </Text>
                </View>
              </Animated.View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <EmptyIcon />
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

// ============================================
// SVG ICONS - Thin stroke (1.5px), rounded ends
// ============================================
const ICON_CLR = '#475569';
const SW = 1.5;

const BackIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5M12 19l-7-7 7-7" stroke={ICON_CLR} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IncomeIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M12 19V5M5 12l7-7 7 7" stroke="#059669" strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ExpenseIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5v14M19 12l-7 7-7-7" stroke="#DB2777" strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const EmptyIcon = () => (
  <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
    <Path d="M3 6h18M3 12h18M3 18h18" stroke="#CBD5E1" strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

// Category icons - thin stroke, geometric
const CategoryIcon: React.FC<{ category: string }> = ({ category }) => {
  const icons: Record<string, React.ReactNode> = {
    Food: (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={9} stroke={ICON_CLR} strokeWidth={SW} fill="none" />
        <Path d="M12 8v4M10 14h4" stroke={ICON_CLR} strokeWidth={SW} strokeLinecap="round" />
      </Svg>
    ),
    Transport: (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Rect x={3} y={6} width={18} height={12} rx={2} stroke={ICON_CLR} strokeWidth={SW} fill="none" />
        <Circle cx={7} cy={18} r={2} stroke={ICON_CLR} strokeWidth={SW} fill="none" />
        <Circle cx={17} cy={18} r={2} stroke={ICON_CLR} strokeWidth={SW} fill="none" />
      </Svg>
    ),
    Shopping: (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M6 6h15l-1.5 9h-12L6 6zM6 6L5 3H2" stroke={ICON_CLR} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Circle cx={10} cy={20} r={1.5} stroke={ICON_CLR} strokeWidth={SW} fill="none" />
        <Circle cx={18} cy={20} r={1.5} stroke={ICON_CLR} strokeWidth={SW} fill="none" />
      </Svg>
    ),
    Bills: (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke={ICON_CLR} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Path d="M14 2v6h6M8 13h8M8 17h8" stroke={ICON_CLR} strokeWidth={SW} strokeLinecap="round" />
      </Svg>
    ),
    Salary: (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={9} stroke={ICON_CLR} strokeWidth={SW} fill="none" />
        <Path d="M12 7v10M9 10c0-1.5 1.3-2 3-2s3 .5 3 2-1.3 2-3 2.5-3 1-3 2.5 1.3 2 3 2" stroke={ICON_CLR} strokeWidth={SW} strokeLinecap="round" fill="none" />
      </Svg>
    ),
    Entertainment: (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Rect x={4} y={6} width={16} height={12} rx={2} stroke={ICON_CLR} strokeWidth={SW} fill="none" />
        <Path d="M10 9l5 3-5 3V9z" stroke={ICON_CLR} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
    ),
    Health: (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke={ICON_CLR} strokeWidth={SW} fill="none" />
      </Svg>
    ),
  };
  return icons[category] || icons.Bills;
};

// Helpers
const getCategoryColor = (cat: string): string => {
  const map: Record<string, string> = {
    Food: THEME_COLORS.peach, Transport: THEME_COLORS.backgroundGradientEnd, Shopping: THEME_COLORS.lavender, Bills: THEME_COLORS.error,
    Entertainment: THEME_COLORS.accent, Health: THEME_COLORS.mint, Salary: THEME_COLORS.mint, Freelance: THEME_COLORS.backgroundGradientEnd, Others: THEME_COLORS.textMuted,
  };
  return map[cat] || THEME_COLORS.textMuted;
};

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: THEME_COLORS.surface, justifyContent: 'center', alignItems: 'center', ...THEME_SHADOWS.card },
  headerTitle: { fontSize: 18, fontWeight: '600', color: THEME_COLORS.textPrimary, flex: 1, textAlign: 'center' },
  
  summaryRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 20 },
  summaryBlob: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20 },
  summaryLabel: { fontSize: 12, fontWeight: '400', color: THEME_COLORS.textSecondary },
  summaryValue: { fontSize: 16, fontWeight: '600', color: THEME_COLORS.textPrimary, marginTop: 2 },
  
  toggleContainer: { paddingHorizontal: 20, marginBottom: 20 },
  toggleBlob: { flexDirection: 'row', backgroundColor: THEME_COLORS.surface, borderRadius: 24, padding: 4, ...THEME_SHADOWS.card },
  toggleItem: { flex: 1, paddingVertical: 12, borderRadius: 20, alignItems: 'center' },
  toggleItemActive: { backgroundColor: THEME_COLORS.accent },
  toggleText: { fontSize: 14, fontWeight: '600', color: THEME_COLORS.textSecondary },
  toggleTextActive: { color: THEME_COLORS.surface },
  
  listContainer: { flex: 1, backgroundColor: THEME_COLORS.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, ...THEME_SHADOWS.elevated },
  txCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  txCardBorder: { borderBottomWidth: 1, borderBottomColor: THEME_COLORS.divider },
  txIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txInfo: { flex: 1 },
  txTitle: { fontSize: 15, fontWeight: '600', color: THEME_COLORS.textPrimary },
  txMeta: { fontSize: 12, fontWeight: '400', color: THEME_COLORS.textMuted, marginTop: 3 },
  txAmount: { fontSize: 15, fontWeight: '600', color: THEME_COLORS.textPrimary },
  txAmountGreen: { color: THEME_COLORS.successText },
  
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 14, fontWeight: '500', color: THEME_COLORS.textMuted, marginTop: 16 },
});

export default TransactionsScreen;
