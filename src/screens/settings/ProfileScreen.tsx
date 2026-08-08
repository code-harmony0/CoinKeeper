import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, User, Phone, Mail, Camera } from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import RNFS from 'react-native-fs';
import {
  launchCamera,
  launchImageLibrary,
  ImagePickerResponse,
  ImageLibraryOptions,
} from 'react-native-image-picker';
import { PressableScale } from '../../components/anim';
import {
  SettingsCard,
  SettingsDivider,
  SettingsRow,
} from '../../components/shared/SettingsRow';
import { useSpecTheme } from '../../theme/specTheme';
import { SETTINGS_TINTS } from '../../theme/settingsIcons';
import { useOptionalAuth } from '../../hooks/useOptionalAuth';
import { getPreference, setPreference } from '../../store/database';

const AVATAR_SIZE = 112;
const CAMERA_BADGE_SIZE = 34;

const pickerOptions: ImageLibraryOptions = {
  mediaType: 'photo',
  quality: 0.7,
  maxWidth: 512,
  maxHeight: 512,
  selectionLimit: 1,
  includeBase64: true,
};

const initialsOf = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .map(part => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

export const ProfileScreen: React.FC<any> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, inputRadius, isDark } = useSpecTheme();
  const { userProfile } = useOptionalAuth();
  const [name, setName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameRef = useRef('');

  const avatarPair = SETTINGS_TINTS.blue[isDark ? 'dark' : 'light'];

  // Load saved name + avatar from local SQLite
  useEffect(() => {
    (async () => {
      try {
        const [savedName, savedAvatar] = await Promise.all([
          getPreference('profile_name'),
          getPreference('profile_avatar'),
        ]);
        if (savedName !== null) {
          setName(savedName);
          nameRef.current = savedName;
        }
        if (savedAvatar) {
          setAvatarUri(savedAvatar);
        }
      } catch (error) {
        console.error('[ProfileScreen] Failed to load profile:', error);
      }
    })();
  }, []);

  const saveName = useCallback((value: string) => {
    setPreference('profile_name', value).catch(error => {
      console.error('[ProfileScreen] Error saving profile_name:', error);
    });
  }, []);

  const handleChangeName = useCallback(
    (value: string) => {
      setName(value);
      nameRef.current = value;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => saveName(value), 400);
    },
    [saveName],
  );

  const flushName = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
      saveName(nameRef.current);
    }
  }, [saveName]);

  // Flush any pending save when leaving the screen
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveName(nameRef.current);
      }
    };
  }, [saveName]);

  // The avatar is stored as an inline base64 data URI — no filesystem, no
  // URI schemes, survives restarts and cache cleanup. 512px is plenty for a
  // 112px avatar while keeping the stored string small.
  const handleAvatarSelected = useCallback(async (uri: string) => {
    setAvatarUri(uri);
    ReactNativeHapticFeedback.trigger('notificationSuccess');
    try {
      await setPreference('profile_avatar', uri);
    } catch (error) {
      console.error('[ProfileScreen] Error saving avatar:', error);
      Alert.alert('Error', 'Failed to save photo. Please try again.');
    }
  }, []);

  const handleImageResponse = useCallback(
    (response: ImagePickerResponse) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert('Error', response.errorMessage || 'Failed to select image');
        return;
      }
      const asset = response.assets?.[0];
      if (!asset) return;

      if (asset.base64) {
        handleAvatarSelected(
          `data:${asset.type || 'image/jpeg'};base64,${asset.base64}`,
        );
        return;
      }

      // Some pickers (e.g. the Android 13+ photo picker) can return a URI
      // without base64. Read the file ourselves so the avatar is always an
      // inline data URI and survives cache cleanups.
      if (asset.uri) {
        RNFS.readFile(asset.uri, 'base64')
          .then(base64 => {
            handleAvatarSelected(
              `data:${asset.type || 'image/jpeg'};base64,${base64}`,
            );
          })
          .catch(error => {
            console.error(
              '[ProfileScreen] Failed to read picked image:',
              error,
            );
            Alert.alert('Error', 'Failed to read the selected photo.');
          });
      }
    },
    [handleAvatarSelected],
  );

  const pickFromLibrary = useCallback(() => {
    launchImageLibrary(pickerOptions, handleImageResponse);
  }, [handleImageResponse]);

  const takePhoto = useCallback(() => {
    launchCamera(
      { ...pickerOptions, saveToPhotos: false },
      handleImageResponse,
    );
  }, [handleImageResponse]);

  const openAvatarOptions = useCallback(() => {
    ReactNativeHapticFeedback.trigger('impactLight');
    Alert.alert('Profile Photo', 'Choose a profile picture', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Library', onPress: pickFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [takePhoto, pickFromLibrary]);

  const removeAvatar = useCallback(() => {
    ReactNativeHapticFeedback.trigger('impactLight');
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            ReactNativeHapticFeedback.trigger('notificationWarning');
            setAvatarUri(null);
            setPreference('profile_avatar', '').catch(error => {
              console.error('[ProfileScreen] Error removing avatar:', error);
            });
          },
        },
      ],
    );
  }, []);

  const displayName = userProfile?.name || name;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <PressableScale
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={[styles.backBtn, { backgroundColor: colors.chipBg }]}
        >
          <ChevronLeft color={colors.textPrimary} size={24} />
        </PressableScale>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Profile
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <PressableScale
            onPress={openAvatarOptions}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
          >
            <View>
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={[styles.avatar, { backgroundColor: avatarPair.bg }]}
                  resizeMode="cover"
                />
              ) : displayName.trim() ? (
                <View
                  style={[styles.avatar, { backgroundColor: avatarPair.bg }]}
                >
                  <Text
                    style={[styles.avatarInitials, { color: avatarPair.icon }]}
                  >
                    {initialsOf(displayName)}
                  </Text>
                </View>
              ) : (
                <View
                  style={[styles.avatar, { backgroundColor: avatarPair.bg }]}
                >
                  <User size={48} color={avatarPair.icon} strokeWidth={2} />
                </View>
              )}

              <View
                style={[
                  styles.cameraBadge,
                  {
                    backgroundColor: colors.primaryAccent,
                    borderColor: colors.card,
                  },
                ]}
              >
                <Camera size={16} color="#FFFFFF" strokeWidth={2.5} />
              </View>
            </View>
          </PressableScale>

          <Text style={[styles.avatarHint, { color: colors.textSecondary }]}>
            {avatarUri ? 'Tap to change photo' : 'Add a profile photo'}
          </Text>

          {avatarUri ? (
            <PressableScale
              onPress={removeAvatar}
              haptic="none"
              accessibilityRole="button"
              accessibilityLabel="Remove profile photo"
            >
              <Text style={[styles.avatarRemove, { color: colors.danger }]}>
                Remove photo
              </Text>
            </PressableScale>
          ) : null}
        </View>

        {/* Details */}
        <SettingsCard>
          <SettingsRow
            icon={User}
            tint="blue"
            label="Name"
            children={
              <TextInput
                value={name}
                onChangeText={handleChangeName}
                onBlur={flushName}
                placeholder="Your name"
                placeholderTextColor={colors.textSecondary}
                returnKeyType="done"
                maxLength={40}
                accessibilityLabel="Name"
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceSunken,
                    color: colors.textPrimary,
                    borderRadius: inputRadius,
                  },
                ]}
              />
            }
          />

          {userProfile?.phoneNumber ? (
            <>
              <SettingsDivider />
              <SettingsRow
                icon={Phone}
                tint="green"
                label="Phone"
                description={userProfile.phoneNumber}
              />
            </>
          ) : null}

          {userProfile?.email ? (
            <>
              <SettingsDivider />
              <SettingsRow
                icon={Mail}
                tint="indigo"
                label="Email"
                description={userProfile.email}
              />
            </>
          ) : null}
        </SettingsCard>

        <Text style={[styles.privacyNote, { color: colors.textSecondary }]}>
          Your profile is stored only on this device.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 28, fontFamily: 'Satoshi-Black' },

  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: CAMERA_BADGE_SIZE,
    height: CAMERA_BADGE_SIZE,
    borderRadius: CAMERA_BADGE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  avatarInitials: { fontSize: 36, fontFamily: 'Satoshi-Black' },
  avatarHint: { fontSize: 13, fontFamily: 'Satoshi-Medium', marginTop: 12 },
  avatarRemove: {
    fontSize: 13,
    fontFamily: 'Satoshi-Medium',
    marginTop: 6,
  },

  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    fontSize: 15,
    fontFamily: 'Satoshi-Medium',
  },

  privacyNote: {
    fontSize: 12,
    fontFamily: 'Satoshi-Regular',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default ProfileScreen;
