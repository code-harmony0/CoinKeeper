/**
 * IncomeDetailScreen — the "one level deeper" for income intelligence.
 *
 * These three widgets used to sit on the home screen, where they each
 * self-nulled when short of data and left a screen of empty canvas behind.
 * Income health is reference material you consult, not a daily decision, so
 * home now carries a one-line summary and this screen carries the detail.
 */
import React from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';

import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../../components/anim';
import { NextSalaryWidget } from '../../components/income/NextSalaryWidget';
import { IncomeHealthWidget } from '../../components/income/IncomeHealthWidget';
import { IncomeInsightsWidget } from '../../components/income/IncomeInsightsWidget';

export const IncomeDetailScreen: React.FC<any> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, cardRadius, chipRadius } = useSpecTheme();
  const st = makeStyles(colors, cardRadius, chipRadius);

  return (
    <View style={st.root}>
      <ScrollView
        contentContainerStyle={[
          st.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 48 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.springify()} style={st.header}>
          <PressableScale
            onPress={() => navigation.goBack()}
            style={st.back}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={20} color={colors.textPrimary} strokeWidth={2.2} />
          </PressableScale>
          <Text style={st.title}>Income</Text>
        </Animated.View>

        <View style={st.stack}>
          <NextSalaryWidget />
          <IncomeHealthWidget />
          <IncomeInsightsWidget />
        </View>
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: any, cardRadius: number, chipRadius: number) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 24 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 24,
    },
    back: {
      width: 40,
      height: 40,
      borderRadius: chipRadius,
      backgroundColor: colors.chipBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 28,
      fontFamily: 'Satoshi-Black',
      color: colors.textPrimary,
      letterSpacing: -0.3,
    },
    stack: { gap: 16 },
  });

export default IncomeDetailScreen;
