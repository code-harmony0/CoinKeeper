import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { TransactionDraft } from '../../types/transactionDraft';
import { MessageSquare, Camera } from 'lucide-react-native';

interface Props {
  draft: TransactionDraft;
  mode: 'sms' | 'scan';
}

export const TransactionPreviewCard: React.FC<Props> = ({ draft, mode }) => {
  const { colors, cardRadius } = useSpecTheme();

  let Icon = mode === 'sms' ? MessageSquare : Camera;

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderRadius: cardRadius }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.chipBg }]}>
          <Icon size={20} color={colors.textPrimary} />
        </View>
        <Text style={[styles.title, { color: colors.textSecondary }]}>
          {mode === 'sms' ? 'SMS Extraction' : 'Receipt Scan'}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Amount</Text>
        <Text style={[styles.value, { color: colors.textPrimary }]}>
          ₹{((draft.amount_paise || 0) / 100).toLocaleString()}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Merchant</Text>
        <Text style={[styles.value, { color: colors.textPrimary }]}>
          {draft.merchant_name || 'Pending...'}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
        <Text style={[styles.value, { color: colors.textPrimary }]}>
          {draft.category_id || 'Pending...'}
        </Text>
      </View>

      {mode === 'scan' && draft.subtotal_paise !== undefined && (
        <View style={styles.receiptDetailsBox}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Receipt Breakdown</Text>
          <View style={styles.rowSmall}>
            <Text style={[styles.labelSmall, { color: colors.textSecondary }]}>Subtotal</Text>
            <Text style={[styles.valueSmall, { color: colors.textPrimary }]}>₹{(draft.subtotal_paise / 100).toLocaleString()}</Text>
          </View>
          <View style={styles.rowSmall}>
            <Text style={[styles.labelSmall, { color: colors.textSecondary }]}>Tax</Text>
            <Text style={[styles.valueSmall, { color: colors.textPrimary }]}>₹{((draft.tax_paise || 0) / 100).toLocaleString()}</Text>
          </View>
          
          {draft.line_items && draft.line_items.length > 0 && (
            <View style={styles.lineItemsContainer}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 8 }]}>Items</Text>
              {draft.line_items.map((item, idx) => (
                <View key={idx} style={styles.rowSmall}>
                  <Text style={[styles.labelSmall, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.description}
                  </Text>
                  <Text style={[styles.valueSmall, { color: colors.textPrimary }]}>
                    ₹{(item.amount_paise / 100).toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 15,
  },
  value: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
  },
  receiptDetailsBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  sectionTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  rowSmall: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  labelSmall: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    flex: 1,
    paddingRight: 16,
  },
  valueSmall: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
  },
  lineItemsContainer: {
    marginTop: 4,
  },
});
