import React from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useSpecTheme } from '../../theme/specTheme';
import { Receipt, CheckCircle, AlertTriangle } from 'lucide-react-native';

interface Props {
  imageUri?: string;
  isScanning?: boolean;
  confidence?: number;
}

export const ReceiptPreviewCard: React.FC<Props> = ({ imageUri, isScanning, confidence }) => {
  const { colors, cardRadius } = useSpecTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceSunken, borderRadius: cardRadius }]}>
      {imageUri ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={[styles.image, { borderRadius: cardRadius - 4 }]} />
          {isScanning && (
            <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: cardRadius - 4 }]}>
              <ActivityIndicator color="#FFF" size="large" />
              <Text style={styles.scanningText}>Extracting Data...</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.placeholder}>
          <Receipt size={32} color={colors.textSecondary} />
          <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
            No receipt attached
          </Text>
        </View>
      )}

      {!isScanning && confidence !== undefined && (
        <View style={styles.confidenceRow}>
          {confidence >= 80 ? (
            <CheckCircle size={14} color={colors.success} />
          ) : (
            <AlertTriangle size={14} color={(colors as any).warning || '#F59E0B'} />
          )}
          <Text style={[
            styles.confidenceText, 
            { color: confidence >= 80 ? colors.success : ((colors as any).warning || '#F59E0B') }
          ]}>
            {confidence}% Confidence
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    marginBottom: 16,
  },
  imageContainer: {
    height: 120,
    width: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningText: {
    color: '#FFF',
    fontFamily: 'Satoshi-Bold',
    marginTop: 8,
  },
  placeholder: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(150,150,150,0.2)',
    borderRadius: 16,
  },
  placeholderText: {
    fontFamily: 'Satoshi-Medium',
    marginTop: 8,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
    justifyContent: 'center'
  },
  confidenceText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
  }
});
