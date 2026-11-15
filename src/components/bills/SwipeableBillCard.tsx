import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {
  CheckCircle2,
  Zap,
  Play,
  Droplet,
  Smartphone,
  Receipt,
  MoreVertical,
  type LucideIcon,
} from 'lucide-react-native';
import { fromPaise } from '../../utils/money';
import { Bill } from '../../store/billStore';
import { PressableScale } from '../anim';
import { IconTile } from '../shared/IconTile';
import { brand } from '../../theme/specTheme';
import { daysUntilDue, type BillStatus } from '../../services/billSchedule';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 80;

interface Props {
  bill: Bill;
  /**
   * The bill's real state. This card used to take `isPaid` and `isOverdue`
   * booleans and derive its chip from them, which gave three labels for four
   * states — a bill due today rendered "UPCOMING" while sitting under the red
   * "Needs Attention" header, contradicting the section that contained it.
   */
  status: BillStatus;
  colors: any;
  /** Kept so callers need no change; the row is flat now. */
  cardRadius?: number;
  cardShadow?: any;
  iconContainerRadius?: number;
  /** Hides the hairline under the last row of a section. */
  last?: boolean;
  onMarkPaid: () => void;
  onMenu: () => void;
}

const getBillIcon = (name: string): LucideIcon => {
  const lower = name.toLowerCase();
  if (/electric|power|energy/.test(lower)) return Zap;
  if (/netflix|prime|hulu|tv|movie/.test(lower)) return Play;
  if (lower.includes('water')) return Droplet;
  if (/phone|mobile|internet|wifi|broadband/.test(lower)) return Smartphone;
  return Receipt;
};

const ordinal = (d: number) =>
  [11, 12, 13].includes(d % 100) ? 'th' : ['st', 'nd', 'rd'][(d % 10) - 1] || 'th';

export const SwipeableBillCard: React.FC<Props> = ({
  bill,
  status,
  colors,
  last,
  onMarkPaid,
  onMenu,
}) => {
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);

  const isPaid = status === 'paid';
  const isOverdue = status === 'overdue';
  const daysAway = daysUntilDue(bill.dueDay);

  const handleComplete = () => {
    ReactNativeHapticFeedback.trigger('notificationSuccess');
    onMarkPaid();
    translateX.value = withSpring(0);
  };

  const panGesture = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    { startX: number }
  >({
    onStart: (_, ctx) => {
      ctx.startX = translateX.value;
      scale.value = withSpring(0.98);
    },
    onActive: (event, ctx) => {
      if (!isPaid && event.translationX > 0) {
        translateX.value = ctx.startX + event.translationX;
      }
    },
    onEnd: event => {
      scale.value = withSpring(1);
      if (!isPaid && event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(SCREEN_WIDTH * 1.5, {}, () => {
          runOnJS(handleComplete)();
        });
      } else {
        translateX.value = withSpring(0);
      }
    },
  });

  const rStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale: scale.value }],
  }));

  const rBackgroundStyle = useAnimatedStyle(() => {
    return {
      opacity: translateX.value > 10 ? 1 : 0,
    };
  });

  const Icon = getBillIcon(bill.name);
  const dueText =
    daysAway === 0 ? 'Due today' : daysAway === 1 ? 'Due tomorrow' : `Due in ${daysAway} days`;
  const tag = isPaid
    ? null
    : isOverdue
      ? { label: 'OVERDUE', solid: true }
      : status === 'due-soon'
        ? { label: daysAway === 0 ? 'TODAY' : daysAway === 1 ? 'TOMORROW' : `IN ${daysAway} DAYS`, solid: false }
        : null;
  const meta = [
    bill.isRecurring ? (bill.repeatInterval ? bill.repeatInterval : 'Monthly') : 'One-time',
    `due on the ${bill.dueDay}${ordinal(bill.dueDay)}`,
    bill.autoPayEnabled ? 'auto-pay' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={[styles.container, !last && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <Animated.View style={[styles.backgroundAction, { backgroundColor: colors.success }, rBackgroundStyle]}>
        <CheckCircle2 color="#FFF" size={24} strokeWidth={1.9} />
        <Text style={styles.actionText}>Paid</Text>
      </Animated.View>

      <PanGestureHandler onGestureEvent={panGesture} enabled={!isPaid}>
        <Animated.View style={[styles.card, { backgroundColor: colors.background }, isPaid && { opacity: 0.55 }, rStyle]}>
          {isOverdue ? (
            <View style={[styles.alertTile]}>
              <Icon size={20} strokeWidth={1.7} color={brand.ink} />
            </View>
          ) : (
            <IconTile icon={isPaid ? CheckCircle2 : Icon} />
          )}

          <View style={styles.billInfo}>
            <Text
              numberOfLines={1}
              style={[
                styles.billName,
                { color: isPaid ? colors.textSecondary : colors.textPrimary },
                isPaid && { textDecorationLine: 'line-through' },
              ]}
            >
              {bill.name}
            </Text>
            {tag ? (
              <View
                style={[
                  styles.tag,
                  tag.solid
                    ? { backgroundColor: brand.alert }
                    : { borderWidth: 2, borderColor: brand.alert, paddingVertical: 0 },
                ]}
              >
                <Text style={[styles.tagText, !tag.solid && { color: colors.textPrimary }]}>{tag.label}</Text>
              </View>
            ) : (
              <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
                {isPaid ? 'Paid this cycle' : dueText}
              </Text>
            )}
            <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
              {meta}
            </Text>
          </View>

          <View style={styles.billRight}>
            <Text style={[styles.amount, { color: colors.textPrimary }]}>
              ₹{fromPaise(bill.amountPaise).toLocaleString('en-IN')}
            </Text>
            <PressableScale
              onPress={onMenu}
              haptic="none"
              style={styles.menu}
              accessibilityRole="button"
              accessibilityLabel={`Options for ${bill.name}`}
            >
              <MoreVertical color={colors.textSecondary} size={20} strokeWidth={1.8} />
            </PressableScale>
          </View>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 80, paddingVertical: 8 },
  backgroundAction: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  actionText: { fontFamily: 'Satoshi-Bold', fontSize: 16, lineHeight: 24, color: '#FFFFFF' },
  alertTile: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: brand.alert,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billInfo: { flex: 1, gap: 2 },
  billName: { fontSize: 16, lineHeight: 24, fontFamily: 'Satoshi-Bold' },
  tag: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: 12, lineHeight: 16, fontFamily: 'Satoshi-Black', color: brand.ink, letterSpacing: 0.5 },
  meta: { fontSize: 12, lineHeight: 16, fontFamily: 'Satoshi-Medium' },
  billRight: { alignItems: 'flex-end', justifyContent: 'center' },
  amount: { fontSize: 16, lineHeight: 24, fontFamily: 'Satoshi-Black' },
  menu: { width: 48, height: 40, alignItems: 'flex-end', justifyContent: 'center' },
});
