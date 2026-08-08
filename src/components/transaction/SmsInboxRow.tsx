import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import { useSpecTheme } from '../../theme/specTheme';
import { Check, X, Tag } from 'lucide-react-native';
import { TransactionDraft } from '../../types/transactionDraft';
import { PressableScale } from '../anim';

interface Props {
  item: TransactionDraft;
  categoryName?: string;
  onApprove: () => void;
  onReject: () => void;
  onChangeCategory: () => void;
}

export const SmsInboxRow: React.FC<Props> = ({ item, categoryName, onApprove, onReject, onChangeCategory }) => {
  const { colors, cardRadius } = useSpecTheme();

  const renderRightActions = () => {
    return (
      <View style={styles.actionWrap}>
        <RectButton style={[styles.actionBtn, { backgroundColor: colors.danger }]} onPress={onReject}>
          <X size={24} color="#fff" />
        </RectButton>
        <RectButton style={[styles.actionBtn, { backgroundColor: colors.success }]} onPress={onApprove}>
          <Check size={24} color="#fff" />
        </RectButton>
      </View>
    );
  };

  const confidenceLevel = (item.confidence || 0) >= 90 ? 'high' : (item.confidence || 0) >= 60 ? 'medium' : 'low';

  return (
    <Animated.View entering={FadeInUp} exiting={FadeOutDown} style={{ marginBottom: 12 }}>
      <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: cardRadius }]}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.merchant, { color: colors.textPrimary }]}>{item.merchant_name || 'Unknown'}</Text>
              <Text style={[styles.date, { color: colors.textSecondary }]}>
                {item.date ? new Date(item.date).toLocaleDateString() : ''}
              </Text>
            </View>
            <Text style={[styles.amount, { color: colors.textPrimary }]}>
              ₹{((item.amount_paise || 0) / 100).toLocaleString()}
            </Text>
          </View>

          <View style={styles.footer}>
            <PressableScale
              onPress={onChangeCategory}
              testID={`category-btn-${item.id}`}
              style={[styles.categoryBtn, { backgroundColor: colors.chipBg }]}
            >
              <Tag size={14} color={colors.textSecondary} />
              <Text style={[styles.categoryText, { color: colors.textSecondary }]}>{categoryName || item.category_id || 'Uncategorized'}</Text>
            </PressableScale>
            
            {confidenceLevel === 'high' && (
              <View style={[styles.confidenceBadge, { backgroundColor: colors.success + '20' }]}>
                <Text style={[styles.confidenceText, { color: colors.success }]}>✨ Auto-Categorized</Text>
              </View>
            )}
            {confidenceLevel === 'low' && (
              <View style={[styles.confidenceBadge, { backgroundColor: colors.danger + '20' }]}>
                <Text style={[styles.confidenceText, { color: colors.danger }]}>Needs Review</Text>
              </View>
            )}
            {item.is_duplicate && (
              <View style={[styles.confidenceBadge, { backgroundColor: colors.danger + '20', marginLeft: 8 }]}>
                <Text style={[styles.confidenceText, { color: colors.danger }]}>Duplicate?</Text>
              </View>
            )}
          </View>
        </View>
      </Swipeable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  merchant: { fontSize: 16, fontFamily: 'Satoshi-Bold', marginBottom: 2 },
  date: { fontSize: 13, fontFamily: 'Satoshi-Medium' },
  amount: { fontSize: 18, fontFamily: 'Satoshi-Black' },
  footer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  categoryBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100, gap: 6 },
  categoryText: { fontSize: 13, fontFamily: 'Satoshi-Bold' },
  confidenceBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  confidenceText: { fontSize: 12, fontFamily: 'Satoshi-Bold' },
  actionWrap: { flexDirection: 'row', width: 120 },
  actionBtn: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
