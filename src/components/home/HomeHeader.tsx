import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, typography } from '../../theme/designTokens';

export const HomeHeader = () => (
  <View style={styles.container}>
    <View style={styles.textContainer}>
      <Text style={styles.greeting}>Hello Kevin,</Text>
      <Text style={styles.welcome}>Welcome Back!</Text>
    </View>
    <TouchableOpacity style={styles.profileButton}>
        <Image 
            source={{ uri: 'https://i.pravatar.cc/150?u=a042581f4e29026704d' }} // placeholder image
            style={styles.avatar} 
        />
        <View style={styles.notificationBadge} />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.l,
    paddingTop: spacing.l,
    paddingBottom: spacing.m,
  },
  textContainer: {
    flex: 1,
  },
  greeting: {
    ...typography.body,
    color: colors.textMuted,
  },
  welcome: {
    ...typography.title,
    fontSize: 22,
  },
  profileButton: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.card,
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.card,
  }
});
