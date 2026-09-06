import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  ChevronLeft,
  ShieldCheck,
  Upload,
  Download,
  AlertTriangle,
} from 'lucide-react-native';
import { pick } from '@react-native-documents/picker';
import { Text } from '../../components/ui/Text';
import { useSpecTheme } from '../../theme/specTheme';
import { PressableScale } from '../../components/anim';
import {
  createAndShareBackup,
  readBackup,
  restoreBackup,
  BackupEncryptedError,
  type RestoreMode,
} from '../../services/backup';
import type { CollectedRows } from '../../services/backup';

interface Props {
  navigation: any;
}

/** A pending restore: the file has been read, nothing has been written yet. */
interface PendingRestore {
  rows: CollectedRows;
  totalRows: number;
  transactionCount: number;
}

export const BackupRestoreScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, cardRadius } = useSpecTheme();

  const [usePassphrase, setUsePassphrase] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [pending, setPending] = useState<PendingRestore | null>(null);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [needsPassphrase, setNeedsPassphrase] = useState(false);
  const [restorePassphrase, setRestorePassphrase] = useState('');

  const handleBackup = useCallback(async () => {
    setError(null);

    if (usePassphrase && passphrase !== confirmPassphrase) {
      setError('The passphrases do not match.');
      return;
    }
    if (usePassphrase && passphrase.length === 0) {
      setError('Enter a passphrase, or turn the protection off.');
      return;
    }

    setBusy(true);
    try {
      await createAndShareBackup(usePassphrase ? passphrase : undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the backup.');
    } finally {
      setBusy(false);
    }
  }, [usePassphrase, passphrase, confirmPassphrase]);

  const loadBackup = useCallback(async (path: string, secret?: string) => {
    setBusy(true);
    setError(null);
    try {
      const { rows } = await readBackup(path, secret);
      const totalRows = Object.values(rows).reduce((sum, r) => sum + r.length, 0);
      setPending({
        rows,
        totalRows,
        transactionCount: rows.transactions?.length ?? 0,
      });
      setNeedsPassphrase(false);
    } catch (e) {
      if (e instanceof BackupEncryptedError) {
        // Encrypted, or the passphrase was wrong — both are answered by asking.
        setNeedsPassphrase(true);
        setError(secret ? 'That passphrase did not open the file.' : null);
      } else {
        setError(e instanceof Error ? e.message : 'Could not read that file.');
      }
    } finally {
      setBusy(false);
    }
  }, []);

  const handlePickFile = useCallback(async () => {
    setError(null);
    setPending(null);
    setNeedsPassphrase(false);
    setRestorePassphrase('');

    try {
      const [file] = await pick();
      if (!file?.uri) return;
      setPendingPath(file.uri);
      await loadBackup(file.uri);
    } catch (e) {
      // Cancelling the picker is not an error worth reporting.
      console.warn('[backup] file selection ended:', e);
    }
  }, [loadBackup]);

  const applyRestore = useCallback(
    async (mode: RestoreMode) => {
      if (!pending) return;
      setBusy(true);
      try {
        await restoreBackup(pending.rows, mode);
        setPending(null);
        Alert.alert('Restored', 'Your data is back. Reopen the app to see it.');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'The restore did not complete.');
      } finally {
        setBusy(false);
      }
    },
    [pending],
  );

  const confirmReplace = useCallback(() => {
    Alert.alert(
      'Replace everything?',
      'This erases what is on this phone and puts the backup in its place. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Replace',
          style: 'destructive',
          onPress: () => {
            void applyRestore('replace');
          },
        },
      ],
    );
  }, [applyRestore]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <PressableScale onPress={() => navigation.goBack()} haptic="impactLight">
          <ChevronLeft size={26} color={colors.textPrimary} strokeWidth={2.2} />
        </PressableScale>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Backup & Restore
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 48 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          entering={FadeInDown.springify()}
          style={[styles.card, { backgroundColor: colors.card, borderRadius: cardRadius }]}
        >
          <View style={styles.cardHead}>
            <Upload size={20} color={colors.textPrimary} strokeWidth={2.2} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              Back up
            </Text>
          </View>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Saves every transaction, goal, bill and budget to one file. The file
            stays on this phone until you choose where to send it.
          </Text>

          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>
              Protect with a passphrase
            </Text>
            <Switch
              accessibilityLabel="Protect with a passphrase"
              value={usePassphrase}
              onValueChange={setUsePassphrase}
            />
          </View>

          {usePassphrase && (
            <View>
              <View style={styles.warnRow}>
                <AlertTriangle size={16} color={colors.danger} strokeWidth={2.2} />
                <Text style={[styles.warnText, { color: colors.danger }]}>
                  If you forget this passphrase the backup cannot be recovered.
                  Nobody, including us, can open it for you.
                </Text>
              </View>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.inputBg }]}
                placeholder="Passphrase"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                autoCapitalize="none"
                value={passphrase}
                onChangeText={setPassphrase}
              />
              <TextInput
                style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.inputBg }]}
                placeholder="Confirm passphrase"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                autoCapitalize="none"
                value={confirmPassphrase}
                onChangeText={setConfirmPassphrase}
              />
            </View>
          )}

          <PressableScale
            onPress={handleBackup}
            haptic="impactLight"
            style={[styles.action, { backgroundColor: colors.primaryAccent }]}
          >
            <Text style={styles.actionText}>Back up now</Text>
          </PressableScale>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(80).springify()}
          style={[styles.card, { backgroundColor: colors.card, borderRadius: cardRadius }]}
        >
          <View style={styles.cardHead}>
            <Download size={20} color={colors.textPrimary} strokeWidth={2.2} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              Restore
            </Text>
          </View>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Bring your data back from a backup file.
          </Text>

          <PressableScale
            onPress={handlePickFile}
            haptic="impactLight"
            style={[styles.action, { backgroundColor: colors.chipBg }]}
          >
            <Text style={[styles.actionText, { color: colors.textPrimary }]}>
              Restore from a file
            </Text>
          </PressableScale>

          {needsPassphrase && (
            <View>
              <View style={styles.warnRow}>
                <ShieldCheck size={16} color={colors.textSecondary} strokeWidth={2.2} />
                <Text style={[styles.warnText, { color: colors.textSecondary }]}>
                  This backup is protected.
                </Text>
              </View>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.inputBg }]}
                placeholder="Backup passphrase"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                autoCapitalize="none"
                value={restorePassphrase}
                onChangeText={setRestorePassphrase}
              />
              <PressableScale
                onPress={() => pendingPath && loadBackup(pendingPath, restorePassphrase)}
                haptic="impactLight"
                style={[styles.action, { backgroundColor: colors.primaryAccent }]}
              >
                <Text style={styles.actionText}>Unlock backup</Text>
              </PressableScale>
            </View>
          )}

          {pending && (
            <View style={styles.pendingBlock}>
              <Text style={[styles.body, { color: colors.textPrimary }]}>
                This backup holds {pending.totalRows} rows, including{' '}
                {pending.transactionCount} transactions.
              </Text>

              <PressableScale
                onPress={confirmReplace}
                haptic="impactLight"
                style={[styles.action, { backgroundColor: colors.danger }]}
              >
                <Text style={styles.actionText}>Replace everything</Text>
              </PressableScale>

              <PressableScale
                onPress={() => applyRestore('merge')}
                haptic="impactLight"
                style={[styles.action, { backgroundColor: colors.chipBg }]}
              >
                <Text style={[styles.actionText, { color: colors.textPrimary }]}>
                  Merge with my data
                </Text>
              </PressableScale>
            </View>
          )}
        </Animated.View>

        {busy && <ActivityIndicator style={styles.busy} color={colors.primaryAccent} />}

        {error && (
          <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
        )}
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: { fontSize: 15, fontFamily: 'PlusJakartaSans-Medium' },
  warnRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 12 },
  warnText: { flex: 1, fontSize: 13, lineHeight: 18, fontFamily: 'PlusJakartaSans-Medium' },
  input: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 10,
    fontFamily: 'PlusJakartaSans-Regular',
  },
  action: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  pendingBlock: { gap: 10, marginTop: 8 },
  busy: { marginTop: 12 },
  error: { fontSize: 14, textAlign: 'center', fontFamily: 'PlusJakartaSans-Medium' },
});
