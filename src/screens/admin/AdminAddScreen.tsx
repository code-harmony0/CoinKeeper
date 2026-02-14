/**
 * AdminAddScreen - CREATION HUB
 * Distinct vertical layout for creating new items
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { 
  Users, 
  UserPlus, 
  Calendar, 
  FileText, 
  ArrowRight,
  Clock,
  Shuffle,
  Download,
  ChevronRight
} from 'lucide-react-native';
import { theme } from '../../theme';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { StatusChip } from '../../components/group';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// DATA
// ============================================
const CREATION_ACTIONS = [
  {
    id: 'create-group',
    title: 'Create New Group',
    description: 'Start a new savings circle with friends',
    icon: <Users size={28} color="#00695C" strokeWidth={2.5} />,
    color: '#E0F2F1', // Mint
    accent: '#00695C',
    delay: 100,
  },
  {
    id: 'add-member',
    title: 'Add Member',
    description: 'Invite someone to join your groups',
    icon: <UserPlus size={28} color="#1565C0" strokeWidth={2.5} />,
    color: '#E3F2FD', // Blue
    accent: '#1565C0',
    delay: 200,
  },
  {
    id: 'schedule-draw',
    title: 'Schedule Draw',
    description: 'Set dates for upcoming pot allocations',
    icon: <Calendar size={28} color="#E65100" strokeWidth={2.5} />,
    color: '#FFF3E0', // Orange
    accent: '#E65100',
    delay: 300,
  },
  {
    id: 'announcement',
    title: 'Make Announcement',
    description: 'Broadcast a message to all members',
    icon: <FileText size={28} color="#6A1B9A" strokeWidth={2.5} />,
    color: '#F3E5F5', // Purple
    accent: '#6A1B9A',
    delay: 400,
  },
];

const RECENT_DRAFTS = [
  { id: 'd1', name: 'Office Party Fund', members: 4, date: '2 mins ago', status: 'draft' },
  { id: 'd2', name: 'Goa Trip 2024', members: 8, date: '1 hour ago', status: 'draft' },
];

interface AdminAddScreenProps {
  navigation: any;
}

export const AdminAddScreen: React.FC<AdminAddScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const handlePress = (action: string) => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    
    switch (action) {
      case 'create-group':
        navigation.navigate('Groups', { screen: 'CreateGroup' });
        break;
      case 'add-member':
        navigation.navigate('MembersStack', { screen: 'AddMember' });
        break;
      case 'schedule-draw':
        // TODO: Navigate to Schedule Draw
        break;
      default:
        break;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <Animated.View entering={FadeInUp.springify()} style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Creation Hub</Text>
          <Text style={styles.headerSubtitle}>What would you like to do?</Text>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Creation Cards List */}
        <View style={styles.listContainer}>
          {CREATION_ACTIONS.map((action) => (
            <CreationCard 
              key={action.id}
              action={action}
              onPress={() => handlePress(action.id)}
            />
          ))}
        </View>

        {/* Secondary Actions (Small Grid) */}
        <View style={styles.gridContainer}>
          <SecondaryAction 
            icon={<Shuffle size={20} color="#455A64" />} 
            label="Quick Draw" 
            delay={500} 
            onPress={() => handlePress('quick-draw')}
          />
          <SecondaryAction 
            icon={<Download size={20} color="#455A64" />} 
            label="Export Data" 
            delay={600} 
            onPress={() => handlePress('export')}
          />
        </View>

        {/* Recent Drafts */}
        {RECENT_DRAFTS.length > 0 && (
          <Animated.View entering={FadeInDown.delay(700).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>Continue Working</Text>
            <View style={styles.draftsList}>
              {RECENT_DRAFTS.map((draft) => (
                <Pressable
                  key={draft.id}
                  style={({ pressed }) => [
                    styles.draftCard,
                    pressed && styles.cardPressed,
                  ]}
                  onPress={() => handlePress(`draft-${draft.id}`)}
                >
                  <View style={styles.draftIcon}>
                    <Clock size={20} color="#607D8B" strokeWidth={2.5} />
                  </View>
                  <View style={styles.draftContent}>
                    <Text style={styles.draftTitle}>{draft.name}</Text>
                    <Text style={styles.draftMeta}>
                      {draft.members} members • {draft.date}
                    </Text>
                  </View>
                  <StatusChip status="pending" label="Draft" size="small" />
                </Pressable>
              ))}
            </View>
          </Animated.View>
        )}

      </ScrollView>
    </View>
  );
};

// ============================================
// COMPONENTS
// ============================================

const CreationCard = ({ action, onPress }: { action: typeof CREATION_ACTIONS[0], onPress: () => void }) => (
  <Animated.View entering={FadeInDown.delay(action.delay).springify()}>
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >
      <View style={[styles.iconBox, { backgroundColor: action.color }]}>
        {action.icon}
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{action.title}</Text>
        <Text style={styles.cardDescription}>{action.description}</Text>
      </View>
      <View style={styles.arrowBox}>
        <ChevronRight size={20} color={theme.colors.textTertiary} />
      </View>
    </Pressable>
  </Animated.View>
);

const SecondaryAction = ({ icon, label, delay, onPress }: { icon: React.ReactNode, label: string, delay: number, onPress: () => void }) => (
  <Animated.View entering={ZoomIn.delay(delay).springify()} style={{ flex: 1 }}>
    <Pressable
      style={({ pressed }) => [
        styles.secondaryCard,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >
      {icon}
      <Text style={styles.secondaryLabel}>{label}</Text>
    </Pressable>
  </Animated.View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#98E4C1', // Reverted to Mint Theme as requested
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#121723',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  listContainer: {
    gap: 16,
    marginBottom: 24,
  },
  // Creation Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24, // Squircle
    padding: 20,
    ...theme.shadows.soft,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 20, // Squircle
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#121723',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  arrowBox: {
    marginLeft: 8,
  },
  // Secondary Actions
  gridContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  secondaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    gap: 8,
    ...theme.shadows.soft,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  secondaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#455A64',
  },
  // Drafts
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#121723',
    marginBottom: 16,
  },
  draftsList: {
    gap: 12,
  },
  draftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    ...theme.shadows.soft,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  draftIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#ECEFF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  draftContent: {
    flex: 1,
  },
  draftTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#121723',
    marginBottom: 4,
  },
  draftMeta: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
});
