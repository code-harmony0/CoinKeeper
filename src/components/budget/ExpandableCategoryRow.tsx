import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, interpolate } from 'react-native-reanimated';
import { ChevronDown, Trash2, Edit3, GitMerge } from 'lucide-react-native';
import * as Icons from 'lucide-react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../anim';
import { CategoryData } from '../../screens/user/CategoriesScreen';

interface Props {
  category: CategoryData;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onMerge: (id: string) => void;
}

export const ExpandableCategoryRow: React.FC<Props> = ({ category, onDelete, onEdit, onMerge }) => {
  const { colors, cardRadius, iconShadow } = useSpecTheme();
  const [expanded, setExpanded] = useState(false);
  const progress = useSharedValue(0);

  const toggle = () => {
    setExpanded(!expanded);
    progress.value = withSpring(expanded ? 0 : 1, { damping: 15 });
  };

  const bodyStyle = useAnimatedStyle(() => ({
    height: interpolate(progress.value, [0, 1], [0, 160]),
    opacity: progress.value,
    overflow: 'hidden',
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(progress.value, [0, 1], [0, 180])}deg` }],
  }));

  const IconComp = (Icons as any)[category.icon] || Icons.MoreHorizontal;
  
  // Fake budget data for demo
  const budget = category.monthlySpend > 0 ? category.monthlySpend * 1.2 : 10000;
  const impact = (category.monthlySpend / budget) * 100;
  const isOver = impact > 90;

  return (
    <View style={[styles.container, { backgroundColor: colors.chipBg, borderRadius: cardRadius }]}>
      <TouchableOpacity onPress={toggle} style={styles.header} activeOpacity={0.7}>
        <View style={[styles.iconWrap, { backgroundColor: colors.background }, iconShadow]}>
          <IconComp size={20} color={category.color || colors.primaryAccent} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.textPrimary }]}>{category.name}</Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            {category.usageCount} txs • {category.monthlySpend > 0 ? `₹${category.monthlySpend.toLocaleString()}` : '₹0'}
          </Text>
        </View>
        <Animated.View style={chevronStyle}>
          <ChevronDown size={20} color={colors.textSecondary} />
        </Animated.View>
      </TouchableOpacity>

      <Animated.View style={bodyStyle}>
        <View style={[styles.body, { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
          
          {/* Budget Impact */}
          <View style={styles.budgetRow}>
            <View style={styles.budgetBar}>
              <View style={[styles.budgetFill, { width: `${Math.min(impact, 100)}%`, backgroundColor: isOver ? colors.danger : colors.primaryAccent }]} />
            </View>
            <Text style={[styles.budgetVal, { color: isOver ? colors.danger : colors.textSecondary }]}>
              {Math.round(impact)}% of budget
            </Text>
          </View>
          
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Top Merchants</Text>
          {category.topMerchants.length > 0 ? (
             <View style={styles.merchants}>
               {category.topMerchants.map((m, i) => (
                 <View key={i} style={[styles.merchantChip, { backgroundColor: colors.background }]}>
                   <Text style={[styles.merchantText, { color: colors.textPrimary }]}>{m}</Text>
                 </View>
               ))}
             </View>
          ) : (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>No recent activity</Text>
          )}

          <View style={styles.actions}>
            <View style={styles.actionGroup}>
              <PressableScale onPress={() => onEdit(category.id)} style={[styles.actionBtn, { backgroundColor: colors.background }]}>
                <Edit3 size={16} color={colors.textPrimary} />
                <Text style={[styles.actionText, { color: colors.textPrimary }]}>Edit</Text>
              </PressableScale>
              <PressableScale onPress={() => onMerge(category.id)} style={[styles.actionBtn, { backgroundColor: colors.background }]}>
                <GitMerge size={16} color={colors.textPrimary} />
                <Text style={[styles.actionText, { color: colors.textPrimary }]}>Merge</Text>
              </PressableScale>
            </View>
            <PressableScale onPress={() => onDelete(category.id)} style={[styles.actionBtn, { backgroundColor: colors.danger + '15' }]}>
              <Trash2 size={16} color={colors.danger} />
            </PressableScale>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  iconWrap: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  info: { flex: 1 },
  name: { fontSize: 16, fontFamily: 'Satoshi-Bold', marginBottom: 2 },
  meta: { fontSize: 13, fontFamily: 'Satoshi-Medium' },
  body: { padding: 16, paddingTop: 12 },
  
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  budgetBar: { flex: 1, height: 6, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 3, overflow: 'hidden' },
  budgetFill: { height: '100%', borderRadius: 3 },
  budgetVal: { fontSize: 12, fontFamily: 'Satoshi-Bold' },

  sectionTitle: { fontSize: 12, fontFamily: 'Satoshi-Bold', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  merchants: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  merchantChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  merchantText: { fontSize: 13, fontFamily: 'Satoshi-Medium' },
  empty: { fontSize: 13, fontFamily: 'Satoshi-Medium', fontStyle: 'italic', marginBottom: 16 },
  
  actions: { flexDirection: 'row', justifyContent: 'space-between' },
  actionGroup: { flexDirection: 'row', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 6 },
  actionText: { fontSize: 13, fontFamily: 'Satoshi-Bold' },
});
