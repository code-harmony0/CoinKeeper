import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Wifi } from 'lucide-react-native';

export type WalletCardVariant = 'peach' | 'mint';

export interface WalletCardProps {
  brand?: string;
  last4: string;
  holder: string;
  expiry: string;
  variant?: WalletCardVariant;
}

const GRADIENTS: Record<WalletCardVariant, [string, string]> = {
  // peach -> amber
  peach: ['#FBE3D6', '#E8A15A'],
  // mint -> teal
  mint: ['#D9F3E6', '#2AA88F'],
};

const CARD_WIDTH = 320;
const CARD_HEIGHT = CARD_WIDTH * (10 / 16);

/**
 * Credit-card-shaped visual per DESIGN.md — the one place a gradient fill
 * is allowed (mimics a physical card material). Not wired into a screen
 * yet; standalone for future rollout.
 */
export const WalletCard: React.FC<WalletCardProps> = ({
  brand = 'CoinKeeper',
  last4,
  holder,
  expiry,
  variant = 'peach',
}) => {
  const [start, end] = GRADIENTS[variant];

  return (
    <LinearGradient
      colors={[start, end]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.topRow}>
        <Text style={styles.brand}>{brand}</Text>
        <Wifi size={22} color="#FFFFFF" strokeWidth={2} style={styles.contactless} />
      </View>

      <Text style={styles.number}>{`•••• •••• •••• ${last4}`}</Text>

      <View style={styles.bottomRow}>
        <Text style={styles.holder}>{holder.toUpperCase()}</Text>
        <Text style={styles.expiry}>{expiry}</Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    padding: 20,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    fontSize: 15,
    fontFamily: 'Satoshi-Bold',
    color: '#FFFFFF',
  },
  contactless: {
    transform: [{ rotate: '90deg' }],
  },
  number: {
    fontSize: 18,
    fontFamily: 'Satoshi-Medium',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  holder: {
    fontSize: 12,
    fontFamily: 'Satoshi-Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  expiry: {
    fontSize: 12,
    fontFamily: 'Satoshi-Regular',
    color: '#FFFFFF',
  },
});

export default WalletCard;
