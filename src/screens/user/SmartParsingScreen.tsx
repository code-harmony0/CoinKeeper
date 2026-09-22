import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, Sparkles, ShieldCheck, Trash2, FileSearch } from 'lucide-react-native';
import { Text } from '../../components/ui/Text';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../../components/anim';
import { LlmModelManager, type ModelState } from '../../services/llm/LlmModelManager';
import { LlmService } from '../../services/llm/LlmService';
import { MODEL, MODEL_SIZE_LABEL } from '../../services/llm/modelConfig';
import { SmsMissLog, type SmsMiss } from '../../services/sms/smsMissLog';

interface Props {
  navigation: any;
}

export const SmartParsingScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, cardRadius } = useSpecTheme();

  const [state, setState] = useState<ModelState | 'checking'>('checking');
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [misses, setMisses] = useState<SmsMiss[]>([]);
  const [showMisses, setShowMisses] = useState(false);

  const refresh = useCallback(async () => {
    const [modelState, missed] = await Promise.all([
      LlmModelManager.getState(),
      SmsMissLog.list().catch(() => [] as SmsMiss[]),
    ]);
    setState(modelState);
    setMisses(missed);
  }, []);

  const handleClearMisses = useCallback(() => {
    Alert.alert('Clear the list?', 'These messages are only stored on this phone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await SmsMissLog.clear();
          await refresh();
        },
      },
    ]);
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleDownload = useCallback(async () => {
    setError(null);
    setPercent(0);
    setState('downloading');

    const ok = await LlmModelManager.download(setPercent);
    if (!ok) {
      setError('The download did not finish. Check your connection and try again.');
    }
    await refresh();
  }, [refresh]);

  const handleRemove = useCallback(() => {
    Alert.alert(
      'Remove the model?',
      `This frees ${MODEL_SIZE_LABEL}. Messages in formats CoinKeeper already knows will still be read automatically.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await LlmService.unload();
            await LlmModelManager.remove();
            await refresh();
          },
        },
      ],
    );
  }, [refresh]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <PressableScale onPress={() => navigation.goBack()} haptic="impactLight">
          <ChevronLeft size={26} color={colors.textPrimary} strokeWidth={2.2} />
        </PressableScale>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Smarter SMS reading</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 48 }]}>
        <Animated.View
          entering={FadeInDown.springify()}
          style={[styles.card, { backgroundColor: colors.card, borderRadius: cardRadius }]}
        >
          <View style={styles.cardHead}>
            <Sparkles size={20} color={colors.textPrimary} strokeWidth={2.2} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              {MODEL.name}
            </Text>
          </View>

          <Text style={[styles.body, { color: colors.textSecondary }]}>
            CoinKeeper already reads the bank message formats it knows. This
            optional {MODEL_SIZE_LABEL} download helps it read the ones it
            doesn't — new banks, new wallets, unusual wording.
          </Text>

          <View style={styles.noteRow}>
            <ShieldCheck size={16} color={colors.textSecondary} strokeWidth={2.2} />
            <Text style={[styles.note, { color: colors.textSecondary }]}>
              It runs entirely on this phone. Your messages are never uploaded,
              and it works with no internet once installed.
            </Text>
          </View>

          {state === 'checking' && <ActivityIndicator color={colors.primaryAccent} />}

          {state === 'absent' && (
            <PressableScale
              onPress={handleDownload}
              haptic="impactLight"
              style={[styles.action, { backgroundColor: colors.primaryAccent }]}
            >
              <Text style={[styles.actionText, { color: colors.onAccent }]}>
                Download ({MODEL_SIZE_LABEL})
              </Text>
            </PressableScale>
          )}

          {state === 'downloading' && (
            <View style={styles.progressBlock}>
              <View style={[styles.track, { backgroundColor: colors.surfaceSunken }]}>
                <View
                  style={[
                    styles.fill,
                    { backgroundColor: colors.primaryAccent, width: `${percent}%` },
                  ]}
                />
              </View>
              <Text style={[styles.note, { color: colors.textSecondary }]}>
                Downloading… {percent}%
              </Text>
              <PressableScale
                onPress={() => {
                  LlmModelManager.cancel();
                  void refresh();
                }}
                haptic="impactLight"
                style={[styles.action, { backgroundColor: colors.chipBg }]}
              >
                <Text style={[styles.actionText, { color: colors.textPrimary }]}>Cancel</Text>
              </PressableScale>
            </View>
          )}

          {state === 'ready' && (
            <View style={styles.progressBlock}>
              <Text style={[styles.ready, { color: colors.success }]}>
                Installed and in use.
              </Text>
              <PressableScale
                onPress={handleRemove}
                haptic="impactLight"
                style={[styles.action, { backgroundColor: colors.chipBg }]}
              >
                <View style={styles.cardHead}>
                  <Trash2 size={16} color={colors.danger} strokeWidth={2.2} />
                  <Text style={[styles.actionText, { color: colors.danger }]}>
                    Remove ({MODEL_SIZE_LABEL})
                  </Text>
                </View>
              </PressableScale>
            </View>
          )}

          {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(80).springify()}
          style={[styles.card, { backgroundColor: colors.card, borderRadius: cardRadius }]}
        >
          <View style={styles.cardHead}>
            <FileSearch size={20} color={colors.textPrimary} strokeWidth={2.2} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              Messages we couldn't read
            </Text>
          </View>

          <Text style={[styles.body, { color: colors.textSecondary }]}>
            {misses.length === 0
              ? 'Every bank message so far has been read successfully. Nothing was missed.'
              : `${misses.length} message${misses.length === 1 ? '' : 's'} in a format CoinKeeper doesn't recognise yet. They stay on this phone.`}
          </Text>

          {misses.length > 0 && (
            <>
              <PressableScale
                onPress={() => setShowMisses(v => !v)}
                haptic="impactLight"
                style={[styles.action, { backgroundColor: colors.chipBg }]}
              >
                <Text style={[styles.actionText, { color: colors.textPrimary }]}>
                  {showMisses ? 'Hide messages' : 'Show messages'}
                </Text>
              </PressableScale>

              {showMisses &&
                misses.map(miss => (
                  <View
                    key={miss.id}
                    style={[styles.miss, { backgroundColor: colors.surfaceSunken }]}
                  >
                    <Text style={[styles.missSender, { color: colors.textSecondary }]}>
                      {miss.sender ?? 'Unknown sender'}
                    </Text>
                    <Text style={[styles.missBody, { color: colors.textPrimary }]}>
                      {miss.body}
                    </Text>
                  </View>
                ))}

              <PressableScale
                onPress={handleClearMisses}
                haptic="impactLight"
                style={[styles.action, { backgroundColor: colors.chipBg }]}
              >
                <Text style={[styles.actionText, { color: colors.danger }]}>Clear the list</Text>
              </PressableScale>
            </>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  title: { fontSize: 22, fontFamily: 'PlusJakartaSans-Bold' },
  content: { paddingHorizontal: 24, gap: 20 },
  card: { padding: 20, gap: 14 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: 17, fontFamily: 'PlusJakartaSans-SemiBold' },
  body: { fontSize: 14, lineHeight: 20, fontFamily: 'PlusJakartaSans-Regular' },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  note: { flex: 1, fontSize: 13, lineHeight: 18, fontFamily: 'PlusJakartaSans-Regular' },
  ready: { fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold' },
  progressBlock: { gap: 12 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  action: { paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  // No colour here on purpose — every caller sets one against its own
  // background, and a hardcoded white was invisible on the dark accent.
  actionText: { fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold' },
  error: { fontSize: 13, fontFamily: 'PlusJakartaSans-Regular' },
  miss: { padding: 12, borderRadius: 12, gap: 4 },
  missSender: { fontSize: 11, fontFamily: 'PlusJakartaSans-SemiBold' },
  missBody: { fontSize: 13, lineHeight: 18, fontFamily: 'PlusJakartaSans-Regular' },
});

export default SmartParsingScreen;
