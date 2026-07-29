/**
 * AdminDashboardScreen - ULTRA MODERN BENTO
 * Huge typography, patterned cards, squircle app-icons, polished details
 * FIXED: Auto-hide tab bar on scroll for better content visibility
 */
import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Text, Dimensions } from 'react-native';
import Animated, {
  FadeInDown,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../../../../theme/blobTheme';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Svg, { Path, Circle, Rect, Defs, Pattern } from 'react-native-svg';
import { ActionSquircle } from '../../../../components/ui/ActionSquircle';
import { useTabBarScroll } from '../../../../context/TabBarScrollContext';
import { useTheme } from '../../../../hooks/useTheme';

const { width: _ } = Dimensions.get('window'); // Removed SCREEN_WIDTH as it's unused, replaced with _
const SPRING_CONFIG = { damping: 16, stiffness: 140, mass: 1 };

// ============================================
// REALISTIC DATA
// ============================================
const ADMIN_DATA = {
  name: 'Rajesh Kumar',
  metrics: {
    expectedCollection: 5400000,
    confirmedCollection: 4500000,
    overdueAmount: 320000,
    collectionRate: 83,
    pendingConfirmations: 5,
    groups: 12,
    members: 120,
    draws: 3,
  },
  alerts: [
    { id: '1', message: '5 contributions awaiting approval' },
    { id: '2', message: '3 members have overdue payments' },
  ],
  groups: [
    { id: '1', name: 'Family Savings', members: 12, pool: 720000, nextDraw: '24 Jan', status: 'active' },
    { id: '2', name: 'Office Chit Fund', members: 20, pool: 1500000, nextDraw: '28 Jan', status: 'active' },
    { id: '3', name: 'Neighborhood Trust', members: 15, pool: 900000, nextDraw: '1 Feb', status: 'active' },
  ],
  approvals: [
    { id: '1', name: 'Priya Singh', group: 'Family Savings', amount: 60000, date: '22 Jan' },
    { id: '2', name: 'Amit Sharma', group: 'Office Chit', amount: 75000, date: '22 Jan' },
    { id: '3', name: 'Neha Gupta', group: 'Neighborhood', amount: 60000, date: '21 Jan' },
    { id: '4', name: 'Vikram Patel', group: 'Friends', amount: 50000, date: '21 Jan' },
  ],
};

export const AdminDashboardScreen: React.FC<any> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { scrollY } = useTabBarScroll();
  const { colors, isDark } = useTheme();

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }, []);

  // Scroll handler for auto-hiding tab bar
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Dynamic theme colors
  const themeStyles = {
    container: { backgroundColor: colors.backgroundSecondary },
    card: { backgroundColor: colors.card },
    text: { color: colors.text },
    textSecondary: { color: colors.textSecondary },
  };

  return (
    <View style={[styles.container, themeStyles.container]}>
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {/* ═══════════════════════════════════════════════════════════
            HEADER - HUGE TYPOGRAPHY
        ═══════════════════════════════════════════════════════════ */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
          <View>
            <Text style={[styles.subGreeting, themeStyles.textSecondary]}>{greeting}</Text>
            <Text style={[styles.greetingText, themeStyles.text]}>Hi, {ADMIN_DATA.name.split(' ')[0]}</Text>
          </View>
          <Pressable style={[styles.profileButton, { backgroundColor: colors.card }]}>
            <View style={[styles.profileAvatar, { backgroundColor: colors.accent1 }]}>
              <Text style={[styles.profileInitials, themeStyles.text]}>RK</Text>
            </View>
          </Pressable>
        </Animated.View>

        {/* ═══════════════════════════════════════════════════════════
            ALERTS (Floating Card)
        ═══════════════════════════════════════════════════════════ */}
        {ADMIN_DATA.alerts.length > 0 && (
          <Animated.View entering={ZoomIn.delay(200).springify()}>
            <Pressable style={[styles.alertCard, { backgroundColor: colors.card }]}>
              <View style={styles.alertIconBox}>
                <AlertIcon />
              </View>
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>Action Required</Text>
                <Text style={[styles.alertText, themeStyles.textSecondary]}>{ADMIN_DATA.alerts[0].message}</Text>
              </View>
              <View style={styles.alertBadge}>
                <Text style={styles.alertBadgeText}>{ADMIN_DATA.alerts.length}</Text>
              </View>
            </Pressable>
          </Animated.View>
        )}

        {/* ═══════════════════════════════════════════════════════════
            METRICS BENTO GRID (Patterned)
        ═══════════════════════════════════════════════════════════ */}
        <View style={styles.bentoGrid}>
          {/* Large Card: Confirmed Collection */}
          <Animated.View entering={FadeInDown.delay(300).springify()} style={[styles.bentoLarge, { backgroundColor: colors.card }]}>
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <Svg width="100%" height="100%">
                <Circle cx="100%" cy="0" r="120" fill={colors.accent1} opacity={isDark ? 0.5 : 0.3} />
                <Circle cx="100%" cy="0" r="90" fill={colors.accent1} opacity={isDark ? 0.6 : 0.4} />
              </Svg>
            </View>

            <View style={[styles.bentoIconLarge, { backgroundColor: colors.accent1 }]}><CoinIcon /></View>
            <View>
              <Text style={[styles.bentoLabel, themeStyles.textSecondary]}>Confirmed</Text>
              <Text style={[styles.bentoValueLarge, themeStyles.text]}>₹{(ADMIN_DATA.metrics.confirmedCollection / 100000).toFixed(1)}L</Text>
              <Text style={[styles.bentoLabel, themeStyles.textSecondary]}>{ADMIN_DATA.metrics.collectionRate}% rate</Text>
            </View>
          </Animated.View>

          {/* Small Cards Column */}
          <View style={styles.bentoColumn}>
            <Animated.View entering={FadeInDown.delay(400).springify()} style={[styles.bentoSmall, { backgroundColor: colors.card }]}>
              <View style={[styles.bentoIconSmall, { backgroundColor: colors.accent3 }]}><FolderIcon /></View>
              <View>
                <Text style={[styles.bentoValueSmall, themeStyles.text]}>{ADMIN_DATA.metrics.groups}</Text>
                <Text style={[styles.bentoLabelSmall, themeStyles.textSecondary]}>Groups</Text>
              </View>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(500).springify()} style={[styles.bentoSmall, { backgroundColor: colors.card }]}>
              <View style={[styles.bentoIconSmall, { backgroundColor: THEME.colors.error }]}><AlertIcon /></View>
              <View>
                <Text style={[styles.bentoValueSmall, themeStyles.text]}>{ADMIN_DATA.metrics.pendingConfirmations}</Text>
                <Text style={[styles.bentoLabelSmall, themeStyles.textSecondary]}>Pending</Text>
              </View>
            </Animated.View>
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════
            QUICK ACTIONS (Squircle App Icons)
        ═══════════════════════════════════════════════════════════ */}
        <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.section}>
          <Text style={[styles.sectionTitle, themeStyles.text]}>Quick Actions</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionsScroll}>
            <ActionSquircle icon={<PlusIcon />} label="Create" color={colors.accent1} delay={0} onPress={() => navigation.navigate('Add')} />
            <ActionSquircle icon={<UsersIcon />} label="Members" color={colors.card} delay={50} onPress={() => navigation.navigate('MembersStack')} />
            <ActionSquircle icon={<CoinIcon />} label="Payments" color={colors.accent3} delay={100} onPress={() => navigation.navigate('Collections')} />
            <ActionSquircle icon={<CheckIcon />} label="Approve" color={colors.accent4} badge={5} delay={200} onPress={() => navigation.navigate('Approvals')} />
            <ActionSquircle icon={<ShuffleIcon />} label="Draws" color={colors.accent1} delay={300} onPress={() => navigation.navigate('Draws')} />
            <ActionSquircle icon={<CheckIcon />} label="Confirm" color={colors.accent4} delay={400} onPress={() => navigation.navigate('PaymentConfirmations')} />
            <ActionSquircle icon={<BellIcon />} label="Alerts" color={colors.accent3} delay={500} onPress={() => navigation.navigate('Notifications')} />
          </ScrollView>
        </Animated.View>

        {/* ═══════════════════════════════════════════════════════════
            ACTIVE GROUPS
        ═══════════════════════════════════════════════════════════ */}
        <Animated.View entering={FadeInDown.delay(700).springify()} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Groups</Text>
            <Text style={styles.viewAllText}>View all</Text>
          </View>
          <View style={styles.cardList}>
            {ADMIN_DATA.groups.map((group, i) => (
              <GroupRow key={group.id} group={group} index={i} />
            ))}
          </View>
        </Animated.View>

        {/* ═══════════════════════════════════════════════════════════
            APPROVALS
        ═══════════════════════════════════════════════════════════ */}
        <Animated.View entering={FadeInDown.delay(800).springify()} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Approvals</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{ADMIN_DATA.approvals.length}</Text>
            </View>
          </View>
          <View style={styles.cardList}>
            {ADMIN_DATA.approvals.map((item, i) => (
              <ApprovalRow key={item.id} item={item} isLast={i === ADMIN_DATA.approvals.length - 1} />
            ))}
          </View>
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
};

// ============================================
// COMPONENTS
// ============================================



const GroupRow: React.FC<{ group: typeof ADMIN_DATA.groups[0]; index: number }> = ({ group, index }) => {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: withSpring(scale.value, SPRING_CONFIG) }] }));

  return (
    <Pressable onPressIn={() => { scale.value = 0.98; }} onPressOut={() => { scale.value = 1; }}>
      <Animated.View style={[styles.groupRow, anim]}>
        <View style={styles.groupIcon}><FolderIcon /></View>
        <View style={styles.groupInfo}>
          <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.groupMeta}>{group.members} members • ₹{(group.pool / 100000).toFixed(1)}L</Text>
        </View>
        <View style={styles.groupRight}>
          <View style={[styles.statusChip, group.status === 'active' ? styles.statusActive : styles.statusPaused]}>
            <Text style={styles.statusText}>{group.status}</Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const ApprovalRow: React.FC<{ item: typeof ADMIN_DATA.approvals[0]; isLast: boolean }> = ({ item, isLast }) => (
  <View style={[styles.approvalRow, !isLast && styles.approvalRowBorder]}>
    <View style={styles.approvalInfo}>
      <Text style={styles.approvalName}>{item.name}</Text>
      <Text style={styles.approvalMeta}>{item.group}</Text>
    </View>
    <Text style={styles.approvalAmount}>₹{item.amount.toLocaleString('en-IN')}</Text>
    <View style={styles.approvalActions}>
      <Pressable style={styles.actionBtn}><CheckIcon size={16} /></Pressable>
    </View>
  </View>
);

// ============================================
// ICONS (2.2px stroke)
// ============================================
const SW = 2.2;
const ICON = THEME.colors.textPrimary;

const AlertIcon = () => <Svg width={24} height={24} viewBox="0 0 24 24" fill="none"><Circle cx={12} cy={12} r={10} stroke={THEME.colors.errorText} strokeWidth={SW} /><Path d="M12 8v4M12 16h.01" stroke={THEME.colors.errorText} strokeWidth={SW} strokeLinecap="round" /></Svg>;
const WalletIcon = () => <Svg width={32} height={32} viewBox="0 0 24 24" fill="none"><Path d="M21 8V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-1" stroke={ICON} strokeWidth={SW} /><Circle cx={17} cy={12} r={2.5} stroke={ICON} strokeWidth={SW} /></Svg>;
const FolderIcon = () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"><Path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v11z" stroke={ICON} strokeWidth={SW} /></Svg>;
const UsersIcon = () => <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"><Circle cx={9} cy={7} r={3.5} stroke={ICON} strokeWidth={SW} /><Path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" stroke={ICON} strokeWidth={SW} strokeLinecap="round" /><Path d="M16 3.13a4 4 0 010 7.75M21 21v-2a4 4 0 00-3-3.87" stroke={ICON} strokeWidth={SW} strokeLinecap="round" /></Svg>;
const PlusIcon = () => <Svg width={24} height={24} viewBox="0 0 24 24" fill="none"><Path d="M12 5v14M5 12h14" stroke={ICON} strokeWidth={SW} strokeLinecap="round" /></Svg>;
const CoinIcon = () => <Svg width={24} height={24} viewBox="0 0 24 24" fill="none"><Circle cx={12} cy={12} r={10} stroke={ICON} strokeWidth={SW} /><Path d="M12 6v12M9 9h4.5a2.5 2.5 0 010 5H9" stroke={ICON} strokeWidth={SW} strokeLinecap="round" /></Svg>;
const CheckIcon = ({ size = 24 }) => <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M20 6L9 17l-5-5" stroke={ICON} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
const ShuffleIcon = () => <Svg width={24} height={24} viewBox="0 0 24 24" fill="none"><Path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" stroke={ICON} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
const DownloadIcon = () => <Svg width={24} height={24} viewBox="0 0 24 24" fill="none"><Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke={ICON} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
const BellIcon = () => <Svg width={24} height={24} viewBox="0 0 24 24" fill="none"><Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke={ICON} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" /></Svg>;

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#D8E2FA' }, // Updated to #D8E2FA
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  subGreeting: { fontSize: 15, fontWeight: '500', color: THEME.colors.textSecondary, marginBottom: 4 },
  greetingText: { fontSize: 32, fontWeight: '800', color: THEME.colors.textPrimary, letterSpacing: -0.5 },
  profileButton: { padding: 4, backgroundColor: '#FFF', borderRadius: 20, ...THEME.shadows.card },
  profileAvatar: { width: 44, height: 44, backgroundColor: THEME.colors.lavender, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  profileInitials: { fontSize: 18, fontWeight: '700', color: THEME.colors.textPrimary },

  // Alert Card
  alertCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 28, padding: 18, marginBottom: 28, gap: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, elevation: 3 },
  alertIconBox: { width: 48, height: 48, backgroundColor: THEME.colors.error, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: 15, fontWeight: '700', color: THEME.colors.errorText },
  alertText: { fontSize: 13, fontWeight: '500', color: THEME.colors.textSecondary, marginTop: 2 },
  alertBadge: { backgroundColor: THEME.colors.errorText, width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  alertBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  // Bento Grid
  bentoGrid: { flexDirection: 'row', gap: 14, height: 180, marginBottom: 36 },
  bentoLarge: { flex: 1.4, backgroundColor: '#FFF', borderRadius: 32, padding: 24, justifyContent: 'space-between', overflow: 'hidden', ...THEME.shadows.card },
  bentoColumn: { flex: 1, gap: 14 },
  bentoSmall: { flex: 1, backgroundColor: '#FFF', borderRadius: 28, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, ...THEME.shadows.card },
  
  bentoIconLarge: { width: 52, height: 52, backgroundColor: THEME.colors.lavender, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  bentoLabel: { fontSize: 14, fontWeight: '600', color: THEME.colors.textSecondary },
  bentoValueLarge: { fontSize: 30, fontWeight: '800', color: THEME.colors.textPrimary, letterSpacing: -1 },
  
  bentoIconSmall: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  bentoValueSmall: { fontSize: 20, fontWeight: '700', color: THEME.colors.textPrimary },
  bentoLabelSmall: { fontSize: 12, fontWeight: '500', color: THEME.colors.textSecondary },

  // Quick Actions
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: THEME.colors.textPrimary, marginBottom: 20 },
  actionsScroll: { gap: 16, paddingRight: 20 },


  // Groups List
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  viewAllText: { fontSize: 14, fontWeight: '600', color: THEME.colors.textSecondary },
  cardList: { gap: 14 },
  groupRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 18, borderRadius: 28, ...THEME.shadows.card },
  groupIcon: { width: 48, height: 48, backgroundColor: THEME.colors.surfaceTint, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 16, fontWeight: '700', color: THEME.colors.textPrimary },
  groupMeta: { fontSize: 13, fontWeight: '500', color: THEME.colors.textSecondary, marginTop: 4 },
  groupRight: { alignItems: 'flex-end' },
  statusChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  statusActive: { backgroundColor: THEME.colors.mint },
  statusPaused: { backgroundColor: THEME.colors.peach },
  statusText: { fontSize: 11, fontWeight: '700', color: THEME.colors.textPrimary, textTransform: 'capitalize' },

  // Approvals
  countBadge: { backgroundColor: THEME.colors.errorText, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  countBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  approvalRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 18, borderRadius: 28, ...THEME.shadows.card },
  approvalRowBorder: { marginBottom: 0 },
  approvalInfo: { flex: 1 },
  approvalName: { fontSize: 15, fontWeight: '700', color: THEME.colors.textPrimary },
  approvalMeta: { fontSize: 13, fontWeight: '500', color: THEME.colors.textSecondary },
  approvalAmount: { fontSize: 15, fontWeight: '700', color: THEME.colors.textPrimary, marginRight: 16 },
  approvalActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 40, height: 40, backgroundColor: THEME.colors.mint, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
});

export default AdminDashboardScreen;
