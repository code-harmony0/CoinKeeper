import React, { useState } from 'react';
import { View, StyleSheet, Text, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomBar, TAB_NAMES, TabName, TAB_THEMES } from '../../components/navigation';

const TAB_CONTENT: Record<TabName, { title: string; subtitle: string }> = {
  home: { title: 'Dashboard', subtitle: 'Your financial overview' },
  groups: { title: 'Groups', subtitle: 'Manage chit fund groups' },
  fab: { title: 'Quick Add', subtitle: 'Create new entries' },
  approvals: { title: 'Approvals', subtitle: '5 pending items' },
  settings: { title: 'Settings', subtitle: 'App preferences' },
};

export const BottomBarDemo: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabName>('home');

  const handleTabChange = (tab: TabName) => {
    setActiveTab(tab);
  };

  const handleFabPress = () => {
    console.log('FAB pressed - open bottom sheet');
  };

  const content = TAB_CONTENT[activeTab];
  const theme = TAB_THEMES[activeTab as keyof typeof TAB_THEMES];

  return (
    <View style={[styles.container, { backgroundColor: (theme as any).background || '#C2DFF7' }]}>
      <StatusBar barStyle="dark-content" />
      
      {/* Content Area */}
      <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.subtitle}>{content.subtitle}</Text>

        {/* Mock cards */}
        <View style={styles.cards}>
          <View style={styles.card}>
            <View style={styles.cardLine} />
            <View style={[styles.cardLine, { width: '60%' }]} />
          </View>
          <View style={styles.cardRow}>
            <View style={styles.cardSmall}>
              <View style={styles.cardLineSmall} />
            </View>
            <View style={styles.cardSmall}>
              <View style={styles.cardLineSmall} />
            </View>
          </View>
          <View style={styles.card}>
            <View style={[styles.cardLine, { width: '80%' }]} />
            <View style={[styles.cardLine, { width: '45%' }]} />
          </View>
        </View>
      </View>

      {/* Bottom Bar */}
      <BottomBar
        initialTab="home"
        onTabChange={handleTabChange}
        onFabPress={handleFabPress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#121723',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#5A6B7C',
    marginTop: 8,
  },
  cards: {
    marginTop: 32,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 12,
    shadowColor: '#121723',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  cardLine: {
    height: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 16,
  },
  cardSmall: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#121723',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  cardLineSmall: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    width: '70%',
  },
});

export default BottomBarDemo;
