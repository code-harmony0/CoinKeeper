import React, { useState } from 'react';
import { View, StyleSheet, Text, StatusBar } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomBar } from '../../components/BottomBar';
import { TAB_NAMES, TabName, SCREEN_BACKGROUNDS } from '../../components/BottomBar/theme/colors';

const TAB_CONTENT: Record<TabName, { title: string; subtitle: string }> = {
  home: { title: 'Dashboard', subtitle: 'Your financial overview' },
  groups: { title: 'Groups', subtitle: 'Manage chit fund groups' },
  fab: { title: 'Quick Add', subtitle: 'Create new entries' },
  approvals: { title: 'Approvals', subtitle: '5 pending items' },
  settings: { title: 'Settings', subtitle: 'App preferences' },
};

export const LiquidBarDemo: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabName>('home');

  const handleTabChange = (tab: TabName) => {
    setActiveTab(tab);
  };

  const handleFabPress = () => {
    console.log('FAB pressed - open bottom sheet');
  };

  const content = TAB_CONTENT[activeTab];
  const bgColor = SCREEN_BACKGROUNDS[activeTab as keyof typeof SCREEN_BACKGROUNDS] || SCREEN_BACKGROUNDS.home;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle="dark-content" />
      
      {/* Content Area */}
      <View style={[styles.content, { paddingTop: insets.top + 48 }]}>
        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.subtitle}>{content.subtitle}</Text>

        {/* Mock cards */}
        <View style={styles.cards}>
          <View style={styles.card}>
            <View style={styles.cardAvatar} />
            <View style={styles.cardContent}>
              <View style={styles.cardLine} />
              <View style={[styles.cardLine, { width: '50%' }]} />
            </View>
          </View>
          
          <View style={styles.cardRow}>
            <View style={styles.cardSmall}>
              <Text style={styles.cardLabel}>Balance</Text>
              <Text style={styles.cardValue}>₹4,50,000</Text>
            </View>
            <View style={styles.cardSmall}>
              <Text style={styles.cardLabel}>Groups</Text>
              <Text style={styles.cardValue}>12</Text>
            </View>
          </View>
          
          <View style={styles.card}>
            <View style={styles.cardContent}>
              <View style={[styles.cardLine, { width: '70%' }]} />
              <View style={[styles.cardLine, { width: '40%' }]} />
            </View>
          </View>
          
          <View style={styles.card}>
            <View style={styles.cardContent}>
              <View style={[styles.cardLine, { width: '85%' }]} />
              <View style={[styles.cardLine, { width: '60%' }]} />
            </View>
          </View>
        </View>
      </View>

      {/* Bottom Bar with Liquid Curve */}
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
    fontSize: 34,
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
    flexDirection: 'row',
    gap: 16,
    shadowColor: '#121723',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  cardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E2E8F0',
  },
  cardContent: {
    flex: 1,
    gap: 10,
    justifyContent: 'center',
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
    borderRadius: 18,
    padding: 18,
    shadowColor: '#121723',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94A3B8',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#121723',
    marginTop: 6,
  },
});

export default LiquidBarDemo;
