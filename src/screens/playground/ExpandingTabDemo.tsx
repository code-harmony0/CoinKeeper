import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Text, StatusBar, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  useDerivedValue,
  interpolateColor,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedTabBar } from '../../components/navigation/AnimatedTabBar';
import { TAB_COLORS, TabKey, TAB_LABELS } from '../../components/navigation/theme/colors';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export const ExpandingTabDemo: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const scrollY = useSharedValue(0);
  const animatedTabIndex = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const bgColor = useDerivedValue(() =>
    interpolateColor(animatedTabIndex.value, [0, 1, 2, 3], TAB_COLORS.backgrounds)
  );

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: bgColor.value,
  }));

  const handleTabChange = useCallback((tab: TabKey, index: number) => {
    setActiveTab(tab);
    animatedTabIndex.value = withSpring(index, { damping: 15, stiffness: 100 });
  }, []);

  return (
    <Animated.View style={[styles.container, bgStyle]}>
      <StatusBar barStyle="dark-content" />
      
      <AnimatedScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 48 }]}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        <Text style={styles.title}>{TAB_LABELS[activeTab]}</Text>
        <Text style={styles.subtitle}>Expanding Tab Navigation</Text>

        <View style={styles.cards}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <View key={i} style={styles.card}>
              <View style={styles.avatar} />
              <View style={styles.cardText}>
                <View style={styles.line} />
                <View style={[styles.line, { width: '50%' }]} />
              </View>
            </View>
          ))}
          
          <View style={styles.row}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Balance</Text>
              <Text style={styles.statValue}>₹4,50,000</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Groups</Text>
              <Text style={styles.statValue}>12</Text>
            </View>
          </View>
        </View>
        
        <View style={{ height: 120 }} />
      </AnimatedScrollView>

      <AnimatedTabBar
        scrollY={scrollY}
        onTabChange={handleTabChange}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24 },
  title: { fontSize: 34, fontWeight: '800', color: '#121723', letterSpacing: -0.5 },
  subtitle: { fontSize: 16, fontWeight: '500', color: '#5A6B7C', marginTop: 8 },
  cards: { marginTop: 32, gap: 16 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.9)',
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
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E2E8F0' },
  cardText: { flex: 1, gap: 10, justifyContent: 'center' },
  line: { height: 12, backgroundColor: '#E2E8F0', borderRadius: 6 },
  row: { flexDirection: 'row', gap: 16 },
  stat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#121723',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  statLabel: { fontSize: 13, fontWeight: '500', color: '#94A3B8' },
  statValue: { fontSize: 24, fontWeight: '700', color: '#121723', marginTop: 6 },
});

export default ExpandingTabDemo;
