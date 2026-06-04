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
import { COLORS } from '../../../theme/colors';

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
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primaryBlue} />
        <Text style={styles.loadingText}>Loading permissions...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.springify().damping(16).stiffness(140).mass(1)} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={22} color="#121723" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Permissions & Roles</Text>
          <Text style={styles.headerSubtitle}>Manage access control</Text>
        </View>
      </Animated.View>

      {/* Tab Selector */}
      <Animated.View entering={FadeInDown.delay(30).springify().damping(16).stiffness(140).mass(1)} style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'roles' && styles.activeTab]}
          onPress={() => { ReactNativeHapticFeedback.trigger('selection'); setActiveTab('roles'); }}
        >
          <Shield size={16} color={activeTab === 'roles' ? '#FFFFFF' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'roles' && styles.activeTabText]}>Roles</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.activeTab]}
          onPress={() => { ReactNativeHapticFeedback.trigger('selection'); setActiveTab('users'); }}
        >
          <Users size={16} color={activeTab === 'users' ? '#FFFFFF' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>Users</Text>
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
              <Text style={styles.sectionTitle}>Available Roles</Text>
              {roles.map(role => (
                <TouchableOpacity
                  key={role.id}
                  style={[styles.roleCard, selectedRole?.id === role.id && styles.selectedRoleCard]}
                  onPress={() => handleSelectRole(role)}
                >
                  <View style={[styles.roleIcon, {
                    backgroundColor: role.id === 'super_admin' ? '#FFF3E0' :
                      role.id === 'admin' ? '#E3F2FD' : '#F3E5F5',
                  }]}>
                    {role.id === 'super_admin' ? <ShieldAlert size={20} color="#E65100" /> :
                      role.id === 'admin' ? <ShieldCheck size={20} color={COLORS.primaryBlue} /> :
                        <Shield size={20} color="#7B1FA2" />}
                  </View>
                  <View style={styles.roleInfo}>
                    <Text style={styles.roleName}>{role.name}</Text>
                    <Text style={styles.roleDescription}>{role.description}</Text>
                    <Text style={styles.rolePermCount}>
                      {role.permissions.length} permissions
                    </Text>
                  </View>
                  <ChevronRight size={18} color="#CCC" />
                </TouchableOpacity>
              ))}
            </Animated.View>

            {/* Selected Role Details */}
            {selectedRole && (
              <Animated.View entering={FadeInDown.delay(90).springify().damping(16).stiffness(140).mass(1)} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{selectedRole.name} Permissions</Text>
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
                      style={styles.textInput}
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="Role Name"
                      placeholderTextColor="#999"
                    />
                    <TextInput
                      style={styles.textInput}
                      value={editDescription}
                      onChangeText={setEditDescription}
                      placeholder="Description"
                      placeholderTextColor="#999"
                    />
                  </View>
                )}

                {PERMISSION_GROUPS.map(group => (
                  <View key={group.category} style={styles.permGroup}>
                    <Text style={styles.permGroupTitle}>{group.category}</Text>
                    {group.permissions.map(perm => {
                      const isEnabled = editPermissions.includes(perm.key);
                      return (
                        <View key={perm.key} style={styles.permRow}>
                          <Text style={styles.permLabel}>{perm.label}</Text>
                          <Switch
                            value={isEnabled}
                            onValueChange={() => {
                              if (isEditing) handleTogglePermission(perm.key);
                            }}
                            disabled={!isEditing}
                            trackColor={{ false: '#E0E0E0', true: COLORS.primaryBlue }}
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
            <Text style={styles.sectionTitle}>Admin Users ({users.length})</Text>
            {users.length === 0 ? (
              <View style={styles.emptyState}>
                <Users size={40} color="#CCC" />
                <Text style={styles.emptyTitle}>No Admin Users</Text>
                <Text style={styles.emptySubtitle}>Admin users will appear here</Text>
              </View>
            ) : (
              users.map(user => {
                const userRole = roles.find(r => r.id === user.role);
                return (
                  <TouchableOpacity
                    key={user.id}
                    style={styles.userCard}
                    onPress={() => handleChangeUserRole(user)}
                  >
                    <View style={styles.userAvatar}>
                      <UserCheck size={20} color={COLORS.primaryBlue} />
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{user.displayName}</Text>
                      <Text style={styles.userEmail}>{user.email}</Text>
                    </View>
                    <View style={styles.userRoleBadge}>
                      <Text style={styles.userRoleText}>{userRole?.name || user.role}</Text>
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
  headerTitle: { fontSize: 24, fontFamily: 'PlusJakartaSans-Bold', color: '#121723' },
  headerSubtitle: { fontSize: 13, fontFamily: 'PlusJakartaSans-Regular', color: '#666' },
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
  tabText: { fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold', color: '#666' },
  activeTabText: { color: '#FFFFFF' },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans-Bold', color: '#121723', marginBottom: 12 },
  editButton: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#EBF5FF',
  },
  editButtonText: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold', color: COLORS.primaryBlue },
  saveButton: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 8, backgroundColor: '#2E7D32', gap: 4,
  },
  saveButtonText: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold', color: '#FFFFFF' },
  editFields: { gap: 8, marginBottom: 16 },
  textInput: {
    backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, fontFamily: 'PlusJakartaSans-Regular', color: '#121723',
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  roleCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 16, padding: 14, marginBottom: 8, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  selectedRoleCard: { borderWidth: 2, borderColor: COLORS.primaryBlue },
  roleIcon: {
    width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },
  roleInfo: { flex: 1 },
  roleName: { fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold', color: '#121723' },
  roleDescription: { fontSize: 12, fontFamily: 'PlusJakartaSans-Regular', color: '#999', marginTop: 2 },
  rolePermCount: { fontSize: 11, fontFamily: 'PlusJakartaSans-Medium', color: COLORS.primaryBlue, marginTop: 4 },
  permGroup: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  permGroupTitle: { fontSize: 13, fontFamily: 'PlusJakartaSans-Bold', color: '#121723', marginBottom: 8 },
  permRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6,
  },
  permLabel: { fontSize: 13, fontFamily: 'PlusJakartaSans-Regular', color: '#666', flex: 1 },
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
  userName: { fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold', color: '#121723' },
  userEmail: { fontSize: 12, fontFamily: 'PlusJakartaSans-Regular', color: '#999', marginTop: 2 },
  userRoleBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#F3E5F5',
  },
  userRoleText: { fontSize: 11, fontFamily: 'PlusJakartaSans-SemiBold', color: '#7B1FA2' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans-Bold', color: '#121723', marginTop: 12 },
  emptySubtitle: { fontSize: 13, fontFamily: 'PlusJakartaSans-Regular', color: '#999', marginTop: 4 },
  loadingText: { fontSize: 15, fontFamily: 'PlusJakartaSans-Medium', color: '#666', marginTop: 12 },
});

export default PermissionsRolesScreen;
