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
import { DockContainer, DOCK_THEME, TabKey, TAB_LABELS } from '../../components/dock';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export const FuturisticDockDemo: React.FC = () => {
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
    interpolateColor(animatedTabIndex.value, [0, 1, 2, 3, 4], [...DOCK_THEME.backgrounds])
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
        <Text style={styles.subtitle}>Futuristic Glass Dock</Text>

        <View style={styles.cards}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <View key={i} style={styles.card}>
              <View style={[styles.accent, { backgroundColor: DOCK_THEME.accents[i % 5] }]} />
              <View style={styles.cardText}>
                <View style={styles.line} />
                <View style={[styles.line, { width: '50%' }]} />
              </View>
            </View>
          ))}
        </View>
        
        <View style={{ height: 140 }} />
      </AnimatedScrollView>

      <DockContainer
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
  title: { fontSize: 36, fontWeight: '800', color: '#121723', letterSpacing: -0.5 },
  subtitle: { fontSize: 16, fontWeight: '500', color: '#5A6B7C', marginTop: 8 },
  cards: { marginTop: 32, gap: 16 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.85)',
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
  accent: {
    width: 48,
    height: 48,
    borderRadius: 16,
  },
  cardText: { flex: 1, gap: 10, justifyContent: 'center' },
  line: { height: 12, backgroundColor: '#E2E8F0', borderRadius: 6 },
});

export default FuturisticDockDemo;
