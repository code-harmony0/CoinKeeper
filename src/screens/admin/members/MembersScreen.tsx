/**
 * MembersScreen
 * List of all members with search, filter, and risk status
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Search, Filter, Plus, ChevronRight, ShieldAlert, ShieldCheck, Shield } from 'lucide-react-native';
import { theme } from '../../../theme';
import { useMembers, Member } from '../../../hooks/useMembers';
import { MemberStatusChip, MemberStatus } from '../../../components/member/MemberStatusChip';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

interface MembersScreenProps {
  navigation: any;
}

export const MembersScreen: React.FC<MembersScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { members, isLoading } = useMembers();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<MemberStatus | 'all'>('all');

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchesSearch =
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === 'all' || member.status === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [members, searchQuery, activeFilter]);

  const handleMemberPress = (memberId: string) => {
    ReactNativeHapticFeedback.trigger('selection');
    navigation.navigate('MemberDetails', { memberId });
  };

  const handleAddMember = () => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    navigation.navigate('AddMember');
  };

  const getRiskIcon = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low':
        return <ShieldCheck size={16} color="#2E7D32" />;
      case 'medium':
        return <Shield size={16} color="#F57C00" />;
      case 'high':
        return <ShieldAlert size={16} color="#C62828" />;
    }
  };

  const renderMemberCard = ({ item, index }: { item: Member; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => handleMemberPress(item.id)}
      >
        <View style={styles.cardLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .substring(0, 2)}
            </Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.memberName}>{item.name}</Text>
            <Text style={styles.memberEmail}>{item.email}</Text>
            <View style={styles.tagsRow}>
              <MemberStatusChip status={item.status as MemberStatus} size="small" />
              <View style={[styles.riskTag, styles[`risk${item.riskLevel}`]]}>
                {getRiskIcon(item.riskLevel)}
                <Text style={[styles.riskText, styles[`riskText${item.riskLevel}`]]}>
                  {item.riskScore}% Trust
                </Text>
              </View>
            </View>
          </View>
        </View>
        <ChevronRight size={20} color={theme.colors.textTertiary} />
      </Pressable>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <Animated.View entering={FadeInUp.springify()} style={styles.header}>
        <Text style={styles.headerTitle}>Members</Text>
        <Text style={styles.headerSubtitle}>{members.length} Total</Text>
      </Animated.View>

      {/* Search & Filter */}
      <View style={styles.controls}>
        <View style={styles.searchContainer}>
          <Search size={20} color={theme.colors.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search members..."
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <FlatList
          horizontal
          data={['all', 'active', 'pending', 'suspended'] as const}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.filterChip,
                activeFilter === item && styles.filterChipActive,
              ]}
              onPress={() => {
                ReactNativeHapticFeedback.trigger('selection');
                setActiveFilter(item);
              }}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === item && styles.filterTextActive,
                ]}
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#121723" />
        </View>
      ) : (
        <FlatList
          data={filteredMembers}
          keyExtractor={(item) => item.id}
          renderItem={renderMemberCard}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 80 },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No members found</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <Animated.View entering={FadeInUp.delay(300).springify()} style={[styles.fabContainer, { bottom: insets.bottom + 100 }]}>
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          onPress={handleAddMember}
        >
          <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.fabText}>Add Member</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#121723',
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  controls: {
    padding: theme.spacing.md,
    backgroundColor: '#FFFFFF',
    ...theme.shadows.soft,
    zIndex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16, // Squircle
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#121723',
    height: '100%',
  },
  filterList: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: '#121723',
    borderColor: '#121723',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: theme.spacing.md,
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textTertiary,
  },
  // Card Styles
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 24, // Squircle
    padding: 16,
    ...theme.shadows.soft,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 20, // Squircle
    backgroundColor: '#E2B6CF', // Pink theme accent
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#121723',
  },
  cardInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#121723',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  riskTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  risklow: { backgroundColor: '#E8F5E9' },
  riskmedium: { backgroundColor: '#FFF3E0' },
  riskhigh: { backgroundColor: '#FFEBEE' },
  riskText: { fontSize: 10, fontWeight: '700' },
  riskTextlow: { color: '#2E7D32' },
  riskTextmedium: { color: '#F57C00' },
  riskTexthigh: { color: '#C62828' },
  // FAB
  fabContainer: {
    position: 'absolute',
    right: 20,
    alignSelf: 'center',
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121723',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 32, // Pill
    ...theme.shadows.medium,
    gap: 8,
  },
  fabPressed: {
    transform: [{ scale: 0.95 }],
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
