import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
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
  Repeat,
  Zap,
  Play,
  Droplet,
  Smartphone,
  Receipt,
  MoreVertical,
} from 'lucide-react-native';
import { Text } from '../ui/Text';
import { fromPaise } from '../../utils/money';
import { Bill } from '../../store/billStore';
import { PressableScale } from '../anim';
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
  cardRadius: number;
  cardShadow: any;
  iconContainerRadius: number;
  onMarkPaid: () => void;
  onMenu: () => void;
}

const getBillIcon = (name: string, color: string) => {
  const lower = name.toLowerCase();
  if (
    lower.includes('electric') ||
    lower.includes('power') ||
    lower.includes('energy')
  )
    return <Zap color={color} size={24} />;
  if (
    lower.includes('netflix') ||
    lower.includes('prime') ||
    lower.includes('hulu') ||
    lower.includes('tv') ||
    lower.includes('movie')
  )
    return <Play color={color} size={24} />;
  if (lower.includes('water')) return <Droplet color={color} size={24} />;
  if (
    lower.includes('phone') ||
    lower.includes('mobile') ||
    lower.includes('internet') ||
    lower.includes('wifi') ||
    lower.includes('broadband')
  )
    return <Smartphone color={color} size={24} />;
  return <Receipt color={color} size={24} />;
};

export const SwipeableBillCard: React.FC<Props> = ({
  bill,
  status,
  colors,
  cardRadius,
  cardShadow,
  iconContainerRadius,
  onMarkPaid,
  onMenu,
}) => {
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);

  const isPaid = status === 'paid';
  const isOverdue = status === 'overdue';
  const daysAway = daysUntilDue(bill.dueDay);

  // The shadow wrapper must be OPAQUE. Android draws the elevation shadow
  // behind the view, so a translucent background lets it show straight
  // through — the overdue card (5%-alpha danger) rendered as a solid grey
  // block sitting under the content. The danger tint moved to the inner
  // surface, which carries no elevation.
  const shadowBg = isPaid ? 'transparent' : colors.card;
  const tintBg = isOverdue ? `${colors.danger}0D` : 'transparent';
  const iconBg = isOverdue ? `${colors.danger}1A` : colors.chipBg;
  const iconColor = isOverdue ? colors.danger : colors.textPrimary;

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

  return (
    // cardShadow lives on this static wrapper, not on the Animated.View below — Android's
    // elevation shadow ghosts into a detached gray halo when applied to a view that Reanimated
    // is also transforming (translateX/scale from the swipe gesture).
    <View
      style={[
        styles.container,
        !isPaid && cardShadow,
        { borderRadius: cardRadius, backgroundColor: shadowBg },
      ]}
    >
      <Animated.View
        style={[
          styles.backgroundAction,
          { backgroundColor: colors.success, borderRadius: cardRadius },
          rBackgroundStyle,
        ]}
      >
        <CheckCircle2 color="#FFF" size={28} />
        <Text style={[styles.actionText, { color: '#FFF' }]}>Paid</Text>
      </Animated.View>

      <PanGestureHandler onGestureEvent={panGesture} enabled={!isPaid}>
        <Animated.View
          style={[
            styles.card,
            { borderRadius: cardRadius, backgroundColor: tintBg },
            isPaid && { opacity: 0.6 },
            rStyle,
          ]}
        >
          <View
            style={[
              styles.iconBox,
              { backgroundColor: iconBg, borderRadius: iconContainerRadius },
            ]}
          >
            {getBillIcon(bill.name, iconColor)}
          </View>

          <View style={styles.billInfo}>
            <Text
              variant="h3"
              style={[
                styles.billName,
                isPaid
                  ? {
                      textDecorationLine: 'line-through',
                      color: colors.textSecondary,
                    }
                  : { color: colors.textPrimary },
              ]}
            >
              {bill.name}
            </Text>
            <View style={styles.chipsRow}>
              <View
                style={[
                  styles.statusChip,
                  {
                    backgroundColor: status === 'due-soon'
                      ? `${colors.warning ?? colors.peachDeep}1A`
                      : isPaid
                      ? `${colors.textSecondary}1A`
                      : isOverdue
                      ? `${colors.danger}1A`
                      : `${colors.primaryAccent}1A`,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontFamily: 'Satoshi-Bold',
                    color: status === 'due-soon'
                      ? colors.warning ?? colors.peachDeep
                      : isPaid
                      ? colors.textSecondary
                      : isOverdue
                      ? colors.danger
                      : colors.primaryAccent,
                    letterSpacing: 0.5,
                  }}
                >
                  {isPaid
                    ? 'PAID'
                    : isOverdue
                      ? 'OVERDUE'
                      : status === 'due-soon'
                        ? daysAway === 0
                          ? 'DUE TODAY'
                          : daysAway === 1
                            ? 'DUE TOMORROW'
                            : `DUE IN ${daysAway} DAYS`
                        : 'UPCOMING'}
                </Text>
              </View>
              {bill.isRecurring && (
                <View
                  style={[
                    styles.statusChip,
                    {
                      backgroundColor: colors.inputBg,
                      flexDirection: 'row',
                      alignItems: 'center',
                    },
                  ]}
                >
                  <Repeat
                    color={colors.textSecondary}
                    size={10}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={{
                      fontSize: 10,
                      fontFamily: 'Satoshi-Bold',
                      color: colors.textSecondary,
                      letterSpacing: 0.5,
                    }}
                  >
                    {bill.repeatInterval?.toUpperCase() || 'MONTHLY'}
                  </Text>
                </View>
              )}
              {bill.autoPayEnabled && (
                <View
                  style={[
                    styles.statusChip,
                    {
                      backgroundColor: 'rgba(0, 122, 255, 0.1)',
                      flexDirection: 'row',
                      alignItems: 'center',
                    },
                  ]}
                >
                  <Zap color="#007AFF" size={10} style={{ marginRight: 4 }} />
                  <Text
                    style={{
                      fontSize: 10,
                      fontFamily: 'Satoshi-Bold',
                      color: '#007AFF',
                      letterSpacing: 0.5,
                    }}
                  >
                    AUTO-PAY
                  </Text>
                </View>
              )}
              <Text
                variant="caption"
                style={{
                  color: colors.textSecondary,
                  width: '100%',
                  marginTop: 2,
                }}
              >
                Due on the {bill.dueDay}
                {[11, 12, 13].includes(bill.dueDay % 100)
                  ? 'th'
                  : ['st', 'nd', 'rd'][(bill.dueDay % 10) - 1] || 'th'}
              </Text>
            </View>
          </View>

          <View style={styles.billRight}>
            <Text
              variant="h3"
              style={{ color: colors.textPrimary, marginBottom: 4 }}
            >
              ₹{fromPaise(bill.amountPaise).toLocaleString()}
            </Text>
            <PressableScale
              onPress={onMenu}
              haptic="none"
              style={{ padding: 4 }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={`Options for ${bill.name}`}
            >
              <MoreVertical color={colors.textSecondary} size={20} />
            </PressableScale>
          </View>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  backgroundAction: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 12, // match container
  },
  actionText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    marginLeft: 8,
  },
  iconBox: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  billInfo: {
    flex: 1,
  },
  billName: {
    fontSize: 16,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
    flexWrap: 'wrap',
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  billRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
