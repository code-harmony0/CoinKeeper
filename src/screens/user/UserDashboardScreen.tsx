/**
 * UserDashboardScreen - APPROVED PALETTE
 * #BDE0FE bg, #FAFAF8 surface, mint/peach/lavender accents
 */
import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Text, Dimensions } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../../theme/blobTheme';
import { useTransactions } from '../../hooks/useTransactions';
import { useChitFunds } from '../../hooks/useChitFunds';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const UserDashboardScreen: React.FC<any> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { transactions } = useTransactions();
  const { groups } = useChitFunds();

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }, []);

  const balance = useMemo(() => {
    return transactions.reduce((acc, t) => {
      return t.type === 'income' ? acc + t.amount : acc - t.amount;
    }, 0);
  }, [transactions]);

  const balanceWhole = Math.floor(Math.abs(balance)).toLocaleString('en-IN');
  const balanceDecimal = (Math.abs(balance) % 1).toFixed(2).slice(1);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <Animated.View entering={FadeInDown.delay(50)} style={styles.header}>
          <View>
            <View style={styles.greetingRow}>
              <Text style={styles.greeting}>Hi Sarah!</Text>
              <ChevronDownIcon />
            </View>
            <Text style={styles.subGreeting}>Ready to start your day?</Text>
          </View>
          <PillButton icon={<CardIcon />} label="Cards" />
        </Animated.View>

        {/* BALANCE */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceCurrency}>₹</Text>
            <Text style={styles.balanceWhole}>{balanceWhole}</Text>
            <Text style={styles.balanceDecimal}>{balanceDecimal}</Text>
          </View>
        </Animated.View>

        {/* QUICK ACTIONS */}
        <Animated.View entering={FadeInDown.delay(150)}>
          <View style={styles.connectedPillRow}>
            <ConnectedPill icon={<TransferIcon />} label="Transfer" position="left" />
            <ConnectedPill icon={<QRIcon />} label="Pay QR" position="right" />
          </View>
          <View style={styles.connectedPillRow}>
            <ConnectedPill icon={<DepositIcon />} label="Deposit" position="left" />
            <ConnectedPill icon={<WithdrawIcon />} label="Withdraw" position="right" />
          </View>
        </Animated.View>

        {/* TRANSACTIONS */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>All Transactions</Text>
            <Pressable style={styles.filterButton}>
              <Text style={styles.filterText}>Today</Text>
              <ChevronDownIcon size={14} />
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.avatarScroll}>
            <View style={styles.addAvatarButton}><PlusIcon /></View>
            {['Priya', 'Amit', 'Neha', 'Raj'].map((name, i) => (
              <AvatarPill key={name} name={name} index={i} />
            ))}
          </ScrollView>
        </Animated.View>

        {/* TRANSFER OPTIONS */}
        <Animated.View entering={FadeInDown.delay(250)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Choose Transfer</Text>
            <Pressable><Text style={styles.viewAllText}>View all</Text></Pressable>
          </View>
          <View style={styles.transferGrid}>
            <TransferCard icon={<ContactsIcon />} label="Transfer" sublabel="to contacts" />
            <TransferCard icon={<CardNumberIcon />} label="Transfer" sublabel="card number" />
          </View>
        </Animated.View>

        {/* CHIT GROUPS */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Chit Groups</Text>
            <Pressable><Text style={styles.viewAllText}>View all</Text></Pressable>
          </View>
          <View style={styles.groupsGrid}>
            {groups.slice(0, 2).map((group, i) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

// COMPONENTS
const PillButton: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: withSpring(scale.value, THEME.animation.spring) }] }));
  
  return (
    <Pressable onPressIn={() => { scale.value = 0.96; }} onPressOut={() => { scale.value = 1; }}>
      <Animated.View style={[styles.pillButton, anim]}>
        {icon}
        <Text style={styles.pillButtonText}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
};

const ConnectedPill: React.FC<{ icon: React.ReactNode; label: string; position: 'left' | 'right' }> = ({ icon, label, position }) => {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: withSpring(scale.value, THEME.animation.spring) }] }));
  
  return (
    <Pressable 
      onPress={() => ReactNativeHapticFeedback.trigger('impactLight')}
      onPressIn={() => { scale.value = 0.96; }} 
      onPressOut={() => { scale.value = 1; }}
      style={[styles.connectedPillWrapper, position === 'left' ? styles.connectedLeft : styles.connectedRight]}
    >
      <Animated.View style={[styles.connectedPill, anim]}>
        <View style={styles.connectedPillIcon}>{icon}</View>
        <Text style={styles.connectedPillLabel}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
};

const AvatarPill: React.FC<{ name: string; index: number }> = ({ name, index }) => {
  const colors = [THEME.colors.lavender, THEME.colors.mint, THEME.colors.peach, THEME.colors.lavender];
  return (
    <View style={[styles.avatarPill, { backgroundColor: colors[index % 4] }]}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarInitial}>{name[0]}</Text>
      </View>
      <Text style={styles.avatarName}>{name}</Text>
    </View>
  );
};

const TransferCard: React.FC<{ icon: React.ReactNode; label: string; sublabel: string }> = ({ icon, label, sublabel }) => {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: withSpring(scale.value, THEME.animation.spring) }] }));
  
  return (
    <Pressable onPressIn={() => { scale.value = 0.96; }} onPressOut={() => { scale.value = 1; }} style={styles.transferCardWrapper}>
      <Animated.View style={[styles.transferCard, anim]}>
        <View style={styles.transferCardIcon}>{icon}</View>
        <Text style={styles.transferCardLabel}>{label}</Text>
        <Text style={styles.transferCardSublabel}>{sublabel}</Text>
      </Animated.View>
    </Pressable>
  );
};

const GroupCard: React.FC<{ group: any }> = ({ group }) => (
  <View style={styles.groupCard}>
    <Text style={styles.groupCardName}>{group.name}</Text>
    <Text style={styles.groupCardMeta}>{group.members?.length || 0} members</Text>
    <Text style={styles.groupCardAmount}>₹{((group.amount || 5000) / 1000).toFixed(0)}K/mo</Text>
  </View>
);

// ICONS (2.2px stroke)
const SW = 2.2;
const ICON_CLR = THEME.colors.textPrimary;
const ICON_GRAY = THEME.colors.textSecondary;

const ChevronDownIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M6 9l6 6 6-6" stroke={ICON_GRAY} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CardIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Rect x={2} y={5} width={20} height={14} rx={3} stroke={ICON_CLR} strokeWidth={SW} fill="none" />
    <Path d="M2 10h20" stroke={ICON_CLR} strokeWidth={SW} />
  </Svg>
);

const TransferIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={10} stroke={ICON_CLR} strokeWidth={SW} fill="none" />
    <Path d="M8 12h8M12 8l4 4-4 4" stroke={ICON_CLR} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const QRIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Rect x={3} y={3} width={7} height={7} rx={1} stroke={ICON_CLR} strokeWidth={SW} fill="none" />
    <Rect x={14} y={3} width={7} height={7} rx={1} stroke={ICON_CLR} strokeWidth={SW} fill="none" />
    <Rect x={3} y={14} width={7} height={7} rx={1} stroke={ICON_CLR} strokeWidth={SW} fill="none" />
    <Rect x={14} y={14} width={3} height={3} stroke={ICON_CLR} strokeWidth={SW} fill="none" />
    <Rect x={18} y={18} width={3} height={3} stroke={ICON_CLR} strokeWidth={SW} fill="none" />
  </Svg>
);

const DepositIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={10} stroke={ICON_CLR} strokeWidth={SW} fill="none" />
    <Path d="M12 7v10M8 13l4 4 4-4" stroke={ICON_CLR} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const WithdrawIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={10} stroke={ICON_CLR} strokeWidth={SW} fill="none" />
    <Path d="M12 17V7M8 11l4-4 4 4" stroke={ICON_CLR} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const PlusIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5v14M5 12h14" stroke="#FFF" strokeWidth={2.5} strokeLinecap="round" />
  </Svg>
);

const ContactsIcon = () => (
  <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
    <Circle cx={9} cy={7} r={3} stroke={ICON_CLR} strokeWidth={SW} fill="none" />
    <Path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" stroke={ICON_CLR} strokeWidth={SW} strokeLinecap="round" />
    <Circle cx={17} cy={7} r={2} stroke={ICON_CLR} strokeWidth={SW} fill="none" />
    <Path d="M21 21v-2a3 3 0 00-2-2.83" stroke={ICON_CLR} strokeWidth={SW} strokeLinecap="round" />
  </Svg>
);

const CardNumberIcon = () => (
  <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
    <Rect x={2} y={5} width={20} height={14} rx={3} stroke={ICON_CLR} strokeWidth={SW} fill="none" />
    <Path d="M2 10h20M6 15h4" stroke={ICON_CLR} strokeWidth={SW} strokeLinecap="round" />
  </Svg>
);

// STYLES
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  greeting: { fontSize: 28, fontWeight: '700', color: THEME.colors.textPrimary },
  subGreeting: { fontSize: 14, fontWeight: '400', color: THEME.colors.textSecondary, marginTop: 4 },
  
  pillButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.colors.surface, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 50, gap: 8, ...THEME.shadows.card },
  pillButtonText: { fontSize: 14, fontWeight: '600', color: THEME.colors.textPrimary },

  balanceSection: { marginBottom: 24 },
  balanceLabel: { fontSize: 13, fontWeight: '500', color: THEME.colors.textSecondary, marginBottom: 4 },
  balanceRow: { flexDirection: 'row', alignItems: 'baseline' },
  balanceCurrency: { fontSize: 32, fontWeight: '700', color: THEME.colors.textPrimary },
  balanceWhole: { fontSize: 42, fontWeight: '700', color: THEME.colors.textPrimary, letterSpacing: -1 },
  balanceDecimal: { fontSize: 28, fontWeight: '400', color: THEME.colors.textSecondary },

  connectedPillRow: { flexDirection: 'row', backgroundColor: THEME.colors.surface, borderRadius: 28, marginBottom: 10, ...THEME.shadows.card },
  connectedPillWrapper: { flex: 1 },
  connectedLeft: { borderRightWidth: 1, borderRightColor: THEME.colors.divider },
  connectedRight: {},
  connectedPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  connectedPillIcon: { width: 40, height: 40, backgroundColor: THEME.colors.surfaceTint, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  connectedPillLabel: { fontSize: 15, fontWeight: '600', color: THEME.colors.textPrimary },

  section: { marginTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: THEME.colors.textPrimary },
  viewAllText: { fontSize: 13, fontWeight: '500', color: THEME.colors.textSecondary },
  filterButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  filterText: { fontSize: 14, fontWeight: '500', color: THEME.colors.textSecondary },

  avatarScroll: { marginLeft: -4 },
  addAvatarButton: { width: 48, height: 48, backgroundColor: THEME.colors.textPrimary, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  avatarPill: { flexDirection: 'row', alignItems: 'center', paddingLeft: 4, paddingRight: 16, paddingVertical: 4, borderRadius: 50, marginRight: 8, gap: 8 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 16, fontWeight: '600', color: THEME.colors.textPrimary },
  avatarName: { fontSize: 14, fontWeight: '600', color: THEME.colors.textPrimary },

  transferGrid: { flexDirection: 'row', gap: 12 },
  transferCardWrapper: { flex: 1 },
  transferCard: { backgroundColor: THEME.colors.surface, borderRadius: 24, padding: 20, ...THEME.shadows.card },
  transferCardIcon: { width: 48, height: 48, backgroundColor: THEME.colors.surfaceTint, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  transferCardLabel: { fontSize: 15, fontWeight: '600', color: THEME.colors.textPrimary },
  transferCardSublabel: { fontSize: 13, fontWeight: '400', color: THEME.colors.textSecondary, marginTop: 2 },

  groupsGrid: { flexDirection: 'row', gap: 12 },
  groupCard: { flex: 1, backgroundColor: THEME.colors.surface, borderRadius: 24, padding: 18, ...THEME.shadows.card },
  groupCardName: { fontSize: 15, fontWeight: '600', color: THEME.colors.textPrimary, marginBottom: 4 },
  groupCardMeta: { fontSize: 12, fontWeight: '400', color: THEME.colors.textSecondary },
  groupCardAmount: { fontSize: 16, fontWeight: '700', color: THEME.colors.textPrimary, marginTop: 12 },
});

export default UserDashboardScreen;
