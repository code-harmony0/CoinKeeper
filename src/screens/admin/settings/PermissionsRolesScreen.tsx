/**
 * PermissionsRolesScreen
 * Admin role management: view roles, assign permissions, manage user access
 * Reads from Firestore `adminRoles` and `users` collections
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import firestore from '@react-native-firebase/firestore';
import {
  ArrowLeft, Shield, Users, ShieldCheck, ShieldAlert,
  Plus, Save, Trash2, ChevronRight, UserCheck,
} from 'lucide-react-native';
import { useTheme } from '../../../hooks/useTheme';

// SPRING_CONFIG replaced with chained methods

// Permission definitions
const PERMISSION_GROUPS = [
  {
    category: 'Groups',
    permissions: [
      { key: 'groups.view', label: 'View Groups' },
      { key: 'groups.create', label: 'Create Groups' },
      { key: 'groups.edit', label: 'Edit Groups' },
      { key: 'groups.delete', label: 'Delete/Archive Groups' },
    ],
  },
  {
    category: 'Members',
    permissions: [
      { key: 'members.view', label: 'View Members' },
      { key: 'members.add', label: 'Add Members' },
      { key: 'members.edit', label: 'Edit Members' },
      { key: 'members.suspend', label: 'Suspend Members' },
    ],
  },
  {
    category: 'Transactions',
    permissions: [
      { key: 'transactions.view', label: 'View Transactions' },
      { key: 'transactions.create', label: 'Create Transactions' },
      { key: 'transactions.approve', label: 'Approve/Reject Transactions' },
    ],
  },
  {
    category: 'Collections',
    permissions: [
      { key: 'collections.view', label: 'View Collections' },
      { key: 'collections.manage', label: 'Manage Collections' },
      { key: 'collections.remind', label: 'Send Reminders' },
    ],
  },
  {
    category: 'Draws',
    permissions: [
      { key: 'draws.view', label: 'View Draws' },
      { key: 'draws.create', label: 'Create Draws' },
      { key: 'draws.manage', label: 'Manage Draw Results' },
    ],
  },
  {
    category: 'Analytics',
    permissions: [
      { key: 'analytics.view', label: 'View Analytics' },
      { key: 'analytics.export', label: 'Export Reports' },
    ],
  },
  {
    category: 'Settings',
    permissions: [
      { key: 'settings.view', label: 'View Settings' },
      { key: 'settings.edit', label: 'Edit Settings' },
      { key: 'settings.audit', label: 'View Audit Logs' },
      { key: 'settings.roles', label: 'Manage Roles' },
    ],
  },
];

interface AdminRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isDefault: boolean;
  createdAt: any;
  updatedAt: any;
}

interface AdminUser {
  id: string;
  displayName: string;
  email: string;
  role: string;
  status: 'active' | 'suspended';
}

type TabView = 'roles' | 'users';

interface Props {
  navigation: any;
}

export const PermissionsRolesScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<TabView>('roles');
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<AdminRole | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const dynamicStyles = {
    container: { backgroundColor: colors.background },
    headerTitle: { color: colors.text },
    headerSubtitle: { color: colors.textSecondary },
    backButton: { backgroundColor: colors.surfaceSecondary },
    tabRow: { backgroundColor: colors.card },
    tabText: { color: colors.textSecondary },
    activeTab: { backgroundColor: isDark ? colors.primary : '#121723' },
    activeTabText: { color: colors.textOnPrimary },
    sectionTitle: { color: colors.text },
    editFields: { backgroundColor: colors.card },
    textInput: { color: colors.text, backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
    roleCard: { backgroundColor: colors.card },
    selectedRoleCard: { borderColor: colors.primary },
    roleName: { color: colors.text },
    roleDescription: { color: colors.textSecondary },
    rolePermCount: { color: colors.primary },
    permGroup: { backgroundColor: colors.card },
    permGroupTitle: { color: colors.text },
    permLabel: { color: colors.textSecondary },
    userCard: { backgroundColor: colors.card },
    userAvatar: { backgroundColor: isDark ? colors.surfaceSecondary : '#E3F2FD' },
    userName: { color: colors.text },
    userEmail: { color: colors.textSecondary },
    userRoleBadge: { backgroundColor: isDark ? colors.surfaceSecondary : '#F3E5F5' },
    userRoleText: { color: isDark ? colors.primary : '#7B1FA2' },
    emptyTitle: { color: colors.text },
    emptySubtitle: { color: colors.textSecondary },
    loadingText: { color: colors.textSecondary },
  };

  // Load roles
  useEffect(() => {
    const unsubRoles = firestore()
      .collection('adminRoles')
      .orderBy('name')
      .onSnapshot(
        snapshot => {
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as AdminRole[];

          // If no roles exist, seed defaults
          if (data.length === 0) {
            setRoles(getDefaultRoles());
          } else {
            setRoles(data);
          }
          setIsLoading(false);
        },
        error => {
          console.error('[Permissions] Error loading roles:', error);
          setRoles(getDefaultRoles());
          setIsLoading(false);
        }
      );

    const unsubUsers = firestore()
      .collection('users')
      .where('role', 'in', ['admin', 'super_admin', 'moderator'])
      .onSnapshot(
        snapshot => {
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            displayName: doc.data().displayName || 'Unknown',
            email: doc.data().email || '',
            role: doc.data().role || 'admin',
            status: doc.data().status || 'active',
          })) as AdminUser[];
          setUsers(data);
        },
        error => {
          console.error('[Permissions] Error loading users:', error);
        }
      );

    return () => {
      unsubRoles();
      unsubUsers();
    };
  }, []);

  const getDefaultRoles = (): AdminRole[] => [
    {
      id: 'super_admin',
      name: 'Super Admin',
      description: 'Full access to all features',
      permissions: PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.key)),
      isDefault: true,
      createdAt: null,
      updatedAt: null,
    },
    {
      id: 'admin',
      name: 'Admin',
      description: 'Standard admin with most permissions',
      permissions: PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.key))
        .filter(p => !p.includes('settings.roles') && !p.includes('delete')),
      isDefault: true,
      createdAt: null,
      updatedAt: null,
    },
    {
      id: 'moderator',
      name: 'Moderator',
      description: 'View-only access with limited actions',
      permissions: PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.key))
        .filter(p => p.includes('view') || p.includes('remind')),
      isDefault: true,
      createdAt: null,
      updatedAt: null,
    },
  ];

  const handleSelectRole = (role: AdminRole) => {
    ReactNativeHapticFeedback.trigger('selection');
    setSelectedRole(role);
    setEditPermissions([...role.permissions]);
    setEditName(role.name);
    setEditDescription(role.description);
    setIsEditing(false);
  };

  const handleTogglePermission = (key: string) => {
    ReactNativeHapticFeedback.trigger('selection');
    setEditPermissions(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  };

  const handleSaveRole = async () => {
    if (!selectedRole || !editName.trim()) return;
    setIsSaving(true);
    ReactNativeHapticFeedback.trigger('impactMedium');

    try {
      await firestore().collection('adminRoles').doc(selectedRole.id).set({
        name: editName.trim(),
        description: editDescription.trim(),
        permissions: editPermissions,
        isDefault: selectedRole.isDefault,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      ReactNativeHapticFeedback.trigger('notificationSuccess');
      Alert.alert('Saved', `Role "${editName}" updated successfully.`);
      setIsEditing(false);
    } catch (error) {
      console.error('[Permissions] Save error:', error);
      ReactNativeHapticFeedback.trigger('notificationError');
      Alert.alert('Error', 'Failed to save role. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeUserRole = (user: AdminUser) => {
    ReactNativeHapticFeedback.trigger('impactLight');
    const roleOptions = roles.map(r => ({
      text: r.name,
      onPress: async () => {
        try {
          await firestore().collection('users').doc(user.id).update({
            role: r.id,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });
          ReactNativeHapticFeedback.trigger('notificationSuccess');
          Alert.alert('Updated', `${user.displayName} is now "${r.name}".`);
        } catch (error) {
          console.error('[Permissions] Role change error:', error);
          Alert.alert('Error', 'Failed to update user role.');
        }
      },
    }));
    Alert.alert(
      'Change Role',
      `Select new role for ${user.displayName}`,
      [...roleOptions, { text: 'Cancel', style: 'cancel' }]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }, dynamicStyles.container]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, dynamicStyles.loadingText]}>Loading permissions...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }, dynamicStyles.container]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.springify().damping(16).stiffness(140).mass(1)} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, dynamicStyles.backButton]}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>Permissions & Roles</Text>
          <Text style={[styles.headerSubtitle, dynamicStyles.headerSubtitle]}>Manage access control</Text>
        </View>
      </Animated.View>

      {/* Tab Selector */}
      <Animated.View entering={FadeInDown.delay(30).springify().damping(16).stiffness(140).mass(1)} style={[styles.tabRow, dynamicStyles.tabRow]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'roles' && styles.activeTab, activeTab === 'roles' && dynamicStyles.activeTab]}
          onPress={() => { ReactNativeHapticFeedback.trigger('selection'); setActiveTab('roles'); }}
        >
          <Shield size={16} color={activeTab === 'roles' ? colors.textOnPrimary : colors.textSecondary} />
          <Text style={[styles.tabText, dynamicStyles.tabText, activeTab === 'roles' && styles.activeTabText, activeTab === 'roles' && dynamicStyles.activeTabText]}>Roles</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.activeTab, activeTab === 'users' && dynamicStyles.activeTab]}
          onPress={() => { ReactNativeHapticFeedback.trigger('selection'); setActiveTab('users'); }}
        >
          <Users size={16} color={activeTab === 'users' ? colors.textOnPrimary : colors.textSecondary} />
          <Text style={[styles.tabText, dynamicStyles.tabText, activeTab === 'users' && styles.activeTabText, activeTab === 'users' && dynamicStyles.activeTabText]}>Users</Text>
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'roles' ? (
          <>
            {/* Role List */}
            <Animated.View entering={FadeInDown.delay(60).springify().damping(16).stiffness(140).mass(1)} style={styles.section}>
              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Available Roles</Text>
              {roles.map(role => (
                <TouchableOpacity
                  key={role.id}
                  style={[
                    styles.roleCard,
                    dynamicStyles.roleCard,
                    selectedRole?.id === role.id && styles.selectedRoleCard,
                    selectedRole?.id === role.id && dynamicStyles.selectedRoleCard
                  ]}
                  onPress={() => handleSelectRole(role)}
                >
                  <View style={[styles.roleIcon, {
                    backgroundColor: role.id === 'super_admin' ? '#FFF3E0' :
                      role.id === 'admin' ? '#E3F2FD' : '#F3E5F5',
                  }]}>
                    {role.id === 'super_admin' ? <ShieldAlert size={20} color="#E65100" /> :
                      role.id === 'admin' ? <ShieldCheck size={20} color={colors.primary} /> :
                        <Shield size={20} color="#7B1FA2" />}
                  </View>
                  <View style={styles.roleInfo}>
                    <Text style={[styles.roleName, dynamicStyles.roleName]}>{role.name}</Text>
                    <Text style={[styles.roleDescription, dynamicStyles.roleDescription]}>{role.description}</Text>
                    <Text style={[styles.rolePermCount, dynamicStyles.rolePermCount]}>
                      {role.permissions.length} permissions
                    </Text>
                  </View>
                  <ChevronRight size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </Animated.View>

            {/* Selected Role Details */}
            {selectedRole && (
              <Animated.View entering={FadeInDown.delay(90).springify().damping(16).stiffness(140).mass(1)} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>{selectedRole.name} Permissions</Text>
                  {!isEditing ? (
                    <TouchableOpacity
                      onPress={() => {
                        ReactNativeHapticFeedback.trigger('impactLight');
                        setIsEditing(true);
                      }}
                      style={styles.editButton}
                    >
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={handleSaveRole}
                      disabled={isSaving}
                      style={styles.saveButton}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Save size={14} color="#FFFFFF" />
                          <Text style={styles.saveButtonText}>Save</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {isEditing && (
                  <View style={styles.editFields}>
                    <TextInput
                      style={[styles.textInput, dynamicStyles.textInput]}
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="Role Name"
                      placeholderTextColor={colors.placeholder}
                    />
                    <TextInput
                      style={[styles.textInput, dynamicStyles.textInput]}
                      value={editDescription}
                      onChangeText={setEditDescription}
                      placeholder="Description"
                      placeholderTextColor={colors.placeholder}
                    />
                  </View>
                )}

                {PERMISSION_GROUPS.map(group => (
                  <View key={group.category} style={[styles.permGroup, dynamicStyles.permGroup]}>
                    <Text style={[styles.permGroupTitle, dynamicStyles.permGroupTitle]}>{group.category}</Text>
                    {group.permissions.map(perm => {
                      const isEnabled = editPermissions.includes(perm.key);
                      return (
                        <View key={perm.key} style={styles.permRow}>
                          <Text style={[styles.permLabel, dynamicStyles.permLabel]}>{perm.label}</Text>
                          <Switch
                            value={isEnabled}
                            onValueChange={() => {
                              if (isEditing) handleTogglePermission(perm.key);
                            }}
                            disabled={!isEditing}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor="#FFFFFF"
                          />
                        </View>
                      );
                    })}
                  </View>
                ))}
              </Animated.View>
            )}
          </>
        ) : (
          /* Users Tab */
          <Animated.View entering={FadeInDown.delay(60).springify().damping(16).stiffness(140).mass(1)} style={styles.section}>
            <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Admin Users ({users.length})</Text>
            {users.length === 0 ? (
              <View style={styles.emptyState}>
                <Users size={40} color={colors.border} />
                <Text style={[styles.emptyTitle, dynamicStyles.emptyTitle]}>No Admin Users</Text>
                <Text style={[styles.emptySubtitle, dynamicStyles.emptySubtitle]}>Admin users will appear here</Text>
              </View>
            ) : (
              users.map(user => {
                const userRole = roles.find(r => r.id === user.role);
                return (
                  <TouchableOpacity
                    key={user.id}
                    style={[styles.userCard, dynamicStyles.userCard]}
                    onPress={() => handleChangeUserRole(user)}
                  >
                    <View style={[styles.userAvatar, dynamicStyles.userAvatar]}>
                      <UserCheck size={20} color={colors.primary} />
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={[styles.userName, dynamicStyles.userName]}>{user.displayName}</Text>
                      <Text style={[styles.userEmail, dynamicStyles.userEmail]}>{user.email}</Text>
                    </View>
                    <View style={[styles.userRoleBadge, dynamicStyles.userRoleBadge]}>
                      <Text style={[styles.userRoleText, dynamicStyles.userRoleText]}>{userRole?.name || user.role}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#C2DFF7' },
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, gap: 14,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 14, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 24, fontFamily: 'Satoshi-Black', color: '#121723' },
  headerSubtitle: { fontSize: 13, fontFamily: 'Satoshi-Regular', color: '#666' },
  tabRow: {
    flexDirection: 'row', marginHorizontal: 20, backgroundColor: '#FFFFFF',
    borderRadius: 14, padding: 4, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 12, gap: 6,
  },
  activeTab: { backgroundColor: '#121723' },
  tabText: { fontSize: 14, fontFamily: 'Satoshi-Bold', color: '#666' },
  activeTabText: { color: '#FFFFFF' },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontFamily: 'Satoshi-Black', color: '#121723', marginBottom: 12 },
  editButton: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#EBF5FF',
  },
  editButtonText: { fontSize: 13, fontFamily: 'Satoshi-Bold', color: '#5B8DEF' },
  saveButton: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 8, backgroundColor: '#2E7D32', gap: 4,
  },
  saveButtonText: { fontSize: 13, fontFamily: 'Satoshi-Bold', color: '#FFFFFF' },
  editFields: { gap: 8, marginBottom: 16 },
  textInput: {
    backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, fontFamily: 'Satoshi-Regular', color: '#121723',
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  roleCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 16, padding: 14, marginBottom: 8, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  selectedRoleCard: { borderWidth: 2, borderColor: '#5B8DEF' },
  roleIcon: {
    width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },
  roleInfo: { flex: 1 },
  roleName: { fontSize: 15, fontFamily: 'Satoshi-Bold', color: '#121723' },
  roleDescription: { fontSize: 12, fontFamily: 'Satoshi-Regular', color: '#999', marginTop: 2 },
  rolePermCount: { fontSize: 11, fontFamily: 'Satoshi-Medium', color: '#5B8DEF', marginTop: 4 },
  permGroup: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  permGroupTitle: { fontSize: 13, fontFamily: 'Satoshi-Black', color: '#121723', marginBottom: 8 },
  permRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6,
  },
  permLabel: { fontSize: 13, fontFamily: 'Satoshi-Regular', color: '#666', flex: 1 },
  userCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 14, padding: 14, marginBottom: 8, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  userAvatar: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#E3F2FD',
    alignItems: 'center', justifyContent: 'center',
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontFamily: 'Satoshi-Bold', color: '#121723' },
  userEmail: { fontSize: 12, fontFamily: 'Satoshi-Regular', color: '#999', marginTop: 2 },
  userRoleBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#F3E5F5',
  },
  userRoleText: { fontSize: 11, fontFamily: 'Satoshi-Bold', color: '#7B1FA2' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontFamily: 'Satoshi-Black', color: '#121723', marginTop: 12 },
  emptySubtitle: { fontSize: 13, fontFamily: 'Satoshi-Regular', color: '#999', marginTop: 4 },
  loadingText: { fontSize: 15, fontFamily: 'Satoshi-Medium', color: '#666', marginTop: 12 },
});

export default PermissionsRolesScreen;
