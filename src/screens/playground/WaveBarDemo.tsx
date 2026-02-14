import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Text, StatusBar, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolateColor,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WaveBottomBar, BACKGROUNDS, TabKey, TABS } from '../../components/BottomBar/WaveBottomBar';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

const CONTENT: Record<TabKey, { title: string; subtitle: string }> = {
  home: { title: 'Dashboard', subtitle: 'Your financial overview' },
  groups: { title: 'Groups', subtitle: 'Manage chit fund groups' },
  approvals: { title: 'Approvals', subtitle: '5 pending items' },
  settings: { title: 'Settings', subtitle: 'App preferences' },
};

export const WaveBarDemo: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const scrollY = useSharedValue(0);
  const animatedTabIndex = useSharedValue(0);

  // Scroll handler for hiding/showing bar
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Animated background color based on active tab
  const bgColor = useDerivedValue(() =>
    interpolateColor(animatedTabIndex.value, [0, 1, 2, 3], BACKGROUNDS)
  );

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: bgColor.value,
  }));

  const handleTabChange = useCallback((tab: TabKey, index: number) => {
    setActiveTab(tab);
    animatedTabIndex.value = withSpring(index, { damping: 15, stiffness: 100 });
  }, []);

  const handleFabPress = useCallback(() => {
    console.log('FAB pressed');
  }, []);

  const content = CONTENT[activeTab];

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
        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.subtitle}>{content.subtitle}</Text>

        <View style={styles.cards}>
          {/* Cards */}
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
          
          {/* More cards for scrolling */}
          {[9, 10, 11, 12].map((i) => (
            <View key={i} style={styles.card}>
              <View style={styles.cardText}>
                <View style={[styles.line, { width: '75%' }]} />
                <View style={[styles.line, { width: '45%' }]} />
              </View>
            </View>
          ))}
        </View>
        
        {/* Bottom padding for tab bar */}
        <View style={{ height: 150 }} />
      </AnimatedScrollView>

      <WaveBottomBar
        scrollY={scrollY}
        onTabChange={handleTabChange}
        onFabPress={handleFabPress}
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

export default WaveBarDemo;
