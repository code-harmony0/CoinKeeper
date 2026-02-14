import React from 'react';
import { View, StyleSheet, Pressable, Image, Alert } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { launchCamera, launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import { BodyText, Caption } from '../core/Typography';
import { COLORS, SPACING, RADIUS } from '../../theme';
import { Camera, Image as ImageIcon, X, FileText } from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

interface ReceiptAttachmentProps {
  imageUri: string | null;
  onImageSelected: (uri: string) => void;
  onImageRemoved: () => void;
}

export const ReceiptAttachment: React.FC<ReceiptAttachmentProps> = ({
  imageUri,
  onImageSelected,
  onImageRemoved,
}) => {
  const handleSelectSource = () => {
    ReactNativeHapticFeedback.trigger('impactLight');

    Alert.alert(
      'Add Receipt',
      'Choose how to add your receipt',
      [
        {
          text: 'Take Photo',
          onPress: handleCamera,
        },
        {
          text: 'Choose from Gallery',
          onPress: handleGallery,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const handleCamera = () => {
    launchCamera(
      {
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: false,
      },
      handleImageResponse
    );
  };

  const handleGallery = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      },
      handleImageResponse
    );
  };

  const handleImageResponse = (response: ImagePickerResponse) => {
    if (response.didCancel) {
      return;
    }

    if (response.errorCode) {
      Alert.alert('Error', response.errorMessage || 'Failed to select image');
      return;
    }

    if (response.assets && response.assets[0]) {
      const uri = response.assets[0].uri;
      if (uri) {
        ReactNativeHapticFeedback.trigger('notificationSuccess');
        onImageSelected(uri);
      }
    }
  };

  const handleRemove = () => {
    ReactNativeHapticFeedback.trigger('impactLight');
    Alert.alert(
      'Remove Receipt',
      'Are you sure you want to remove this receipt?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            ReactNativeHapticFeedback.trigger('notificationWarning');
            onImageRemoved();
          },
        },
      ]
    );
  };

  if (imageUri) {
    return (
      <View style={styles.container}>
        <Caption style={styles.label}>Receipt</Caption>
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
          <Pressable onPress={handleRemove} style={styles.removeButton}>
            <X size={16} color={COLORS.surface} strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Caption style={styles.label}>Receipt (Optional)</Caption>
      <Pressable onPress={handleSelectSource}>
        <AnimatedButton>
          <View style={styles.uploadCard}>
            <View style={styles.uploadIcon}>
              <FileText size={24} color={COLORS.babyBlue} strokeWidth={2} />
            </View>
            <View style={styles.uploadContent}>
              <BodyText medium color={COLORS.navyText}>
                Add Receipt
              </BodyText>
              <Caption color={COLORS.grayText}>
                Take photo or choose from gallery
              </Caption>
            </View>
            <View style={styles.uploadActions}>
              <View style={styles.actionButton}>
                <Camera size={20} color={COLORS.grayText} strokeWidth={2} />
              </View>
              <View style={styles.actionButton}>
                <ImageIcon size={20} color={COLORS.grayText} strokeWidth={2} />
              </View>
            </View>
          </View>
        </AnimatedButton>
      </Pressable>
    </View>
  );
};

const AnimatedButton: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 12 }) }],
  }));

  return (
    <Animated.View
      style={animatedStyle}
      onTouchStart={() => (scale.value = 0.98)}
      onTouchEnd={() => (scale.value = 1)}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: SPACING.sm,
  },
  label: {
    marginBottom: SPACING.xs,
  },
  uploadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: 'rgba(189, 224, 254, 0.15)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.babyBlue,
    borderStyle: 'dashed',
    gap: SPACING.md,
  },
  uploadIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(189, 224, 254, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadContent: {
    flex: 1,
  },
  uploadActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.backgroundGray,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
