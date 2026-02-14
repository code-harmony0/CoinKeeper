import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PLAYGROUND_THEME, TabName } from './playgroundTheme';
import { TabVariantA } from './TabVariantA';
import { TabVariantB } from './TabVariantB';
import { TabVariantC } from './TabVariantC';
import { TabVariantD } from './TabVariantD';
import { TabVariantE } from './TabVariantE';
import { TabVariantF } from './TabVariantF';

interface VariantSectionProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

const VariantSection: React.FC<VariantSectionProps> = ({ title, subtitle, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
    <View style={styles.previewContainer}>
      <View style={styles.fakeContent}>
        <View style={styles.fakeCard} />
        <View style={styles.fakeRow}>
          <View style={styles.fakeCardSmall} />
          <View style={styles.fakeCardSmall} />
        </View>
      </View>
      <View style={styles.tabContainer}>{children}</View>
    </View>
  </View>
);

export const BottomTabPlayground: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [activeA, setActiveA] = useState<TabName>('home');
  const [activeB, setActiveB] = useState<TabName>('groups');
  const [activeC, setActiveC] = useState<TabName>('approvals');
  const [activeD, setActiveD] = useState<TabName>('home');
  const [activeE, setActiveE] = useState<TabName>('approvals');
  const [activeF, setActiveF] = useState<TabName>('home');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={PLAYGROUND_THEME.colors.bgBlue1} />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Tab Bar Exploration</Text>
        <Text style={styles.headerSubtitle}>6 Award-Level Fintech Variants</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <VariantSection title="1. Notched Dock" subtitle="Morphing FAB • Premium hierarchy">
          <TabVariantA activeTab={activeA} onTabPress={setActiveA} />
        </VariantSection>

        <VariantSection title="2. Liquid Indicator" subtitle="Flowing animation • Shared axis">
          <TabVariantB activeTab={activeB} onTabPress={setActiveB} />
        </VariantSection>

        <VariantSection title="3. Glass Dock" subtitle="Frosted blur • High-end polish">
          <TabVariantC activeTab={activeC} onTabPress={setActiveC} />
        </VariantSection>

        <VariantSection title="4. Segmented Modules" subtitle="Elevated capsules • Labels always">
          <TabVariantD activeTab={activeD} onTabPress={setActiveD} />
        </VariantSection>

        <VariantSection title="5. Smart Tab" subtitle="Progress ring • Data-aware expand">
          <TabVariantE activeTab={activeE} onTabPress={setActiveE} />
        </VariantSection>

        <VariantSection title="6. Edge Reveal" subtitle="Minimal • Long-press radial menu">
          <TabVariantF activeTab={activeF} onTabPress={setActiveF} />
        </VariantSection>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>🏆 Best For</Text>
          <View style={styles.footerGrid}>
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>Admin Power</Text>
              <Text style={styles.footerValue}>5. Smart Tab</Text>
            </View>
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>Premium Feel</Text>
              <Text style={styles.footerValue}>3. Glass Dock</Text>
            </View>
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>Action-First</Text>
              <Text style={styles.footerValue}>1. Notched</Text>
            </View>
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>New Users</Text>
              <Text style={styles.footerValue}>4. Segmented</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PLAYGROUND_THEME.colors.bgBlue1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: PLAYGROUND_THEME.colors.inkDark,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: PLAYGROUND_THEME.colors.textSecondary,
    marginTop: 4,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, gap: 24 },
  section: { gap: 10 },
  sectionHeader: { paddingHorizontal: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: PLAYGROUND_THEME.colors.inkDark },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: PLAYGROUND_THEME.colors.textSecondary,
    marginTop: 2,
  },
  previewContainer: {
    height: 240,
    backgroundColor: PLAYGROUND_THEME.colors.surface,
    borderRadius: 22,
    overflow: 'hidden',
    ...PLAYGROUND_THEME.shadow.light,
  },
  fakeContent: { flex: 1, padding: 14, gap: 10, backgroundColor: PLAYGROUND_THEME.colors.bgBlue1 },
  fakeCard: { height: 56, backgroundColor: PLAYGROUND_THEME.colors.surface, borderRadius: 14 },
  fakeRow: { flexDirection: 'row', gap: 10 },
  fakeCardSmall: {
    flex: 1,
    height: 44,
    backgroundColor: PLAYGROUND_THEME.colors.surface,
    borderRadius: 12,
  },
  tabContainer: { justifyContent: 'flex-end' },
  footer: {
    backgroundColor: PLAYGROUND_THEME.colors.surface,
    borderRadius: 18,
    padding: 18,
    ...PLAYGROUND_THEME.shadow.light,
  },
  footerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: PLAYGROUND_THEME.colors.inkDark,
    marginBottom: 12,
  },
  footerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  footerItem: {
    width: '47%',
    backgroundColor: PLAYGROUND_THEME.colors.bgBlue1,
    borderRadius: 12,
    padding: 12,
  },
  footerLabel: { fontSize: 11, fontWeight: '500', color: PLAYGROUND_THEME.colors.textSecondary },
  footerValue: { fontSize: 13, fontWeight: '700', color: PLAYGROUND_THEME.colors.inkDark, marginTop: 4 },
});

export default BottomTabPlayground;
