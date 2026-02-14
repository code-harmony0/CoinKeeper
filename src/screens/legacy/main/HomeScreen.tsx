import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withDelay, withTiming } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../../theme/designTokens';
import { HomeHeader } from '../../components/home/HomeHeader';
import { BalanceCard } from '../../components/core/BalanceCard';
import { QuickActionsRow } from '../../components/home/QuickActionsRow';
import { CreditScore } from '../../components/home/CreditScore';
import { RecentTransactions } from '../../components/home/RecentTransactions';

const AnimatedView = ({ index, children }: { index: number, children: React.ReactNode }) => {
  const translateY = useSharedValue(50);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    translateY.value = withDelay(index * 120, withSpring(0, { damping: 18, stiffness: 150 }));
    opacity.value = withDelay(index * 120, withTiming(1, { duration: 700 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
};

const HomeScreen = () => {
  return (
    <LinearGradient colors={colors.backgroundGradient} style={styles.flex1}>
        <AnimatedView index={0}>
            <HomeHeader />
        </AnimatedView>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            <AnimatedView index={1}>
                <BalanceCard />
            </AnimatedView>
            <AnimatedView index={2}>
                <QuickActionsRow />
            </AnimatedView>
            <AnimatedView index={3}>
                <CreditScore />
            </AnimatedView>
            <AnimatedView index={4}>
                <RecentTransactions />
            </AnimatedView>
        </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 120, // Make space for the floating nav bar
  },
});

export default HomeScreen;
