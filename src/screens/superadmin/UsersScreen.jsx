import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, StyleSheet, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { usersAPI, getErrorMessage } from '../../api/client';
import {
  Card, RoleBadge, Button, Spinner, EmptyState,
  ErrorBanner, Modal, Input, Select, Divider, Avatar,
} from '../../components/ui';
import Colors from '../../constants/colors';
import { Typography, Spacing, Radius } from '../../constants/theme';

const ROLE_OPTIONS = [
  { value: '',              label: 'All Roles' },
  { value: 'health_worker',  label: 'Health Worker' },
  { value: 'specialist',     label: 'Specialist' },
  { value: 'facility_admin', label: 'Facility Admin' },
  { value: 'driver',         label: 'Driver' },
  { value: 'superadmin',     label: 'Super Admin' },
];

const CREATE_ROLE_OPTIONS = ROLE_OPTIONS.slice(1);

const UsersScreen = () => {
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [error, setError]           = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected]     = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setError('');
      const params = {};
      if (search)     params.search = search;
      if (roleFilter) params.role   = roleFilter;
      const res = await usersAPI.getUsers(params);
      setUsers(res.data?.results || res.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    const t = setTimeout(fetchUsers, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [fetchUsers]);

  const onRefresh = () => { setRefreshing(true); fetchUsers(); };

  const handleToggleActive = async (id) => {
    try {
      await usersAPI.toggleUserActive(id);
      fetchUsers();
      setShowDetail(false);
    } catch (err) { setError(getErrorMessage(err)); }
  };

  const handleDelete = async (id) => {
    try {
      await usersAPI.deleteUser(id);
      setShowDetail(false);
      fetchUsers();
    } catch (err) { setError(getErrorMessage(err)); }
  };

  const renderItem = ({ item }) => {
    const fullName = [item.first_name, item.last_name].filter(Boolean).join(' ') || item.email;
    return (
      <TouchableOpacity onPress={() => { setSelected(item); setShowDetail(true); }} activeOpacity={0.8}>
        <Card style={styles.card}>
          <View style={styles.cardRow}>
            <Avatar name={fullName} size={42} style={{ marginRight: Spacing[3] }} />
            <View style={styles.cardInfo}>
              <Text style={styles.cardName} numberOfLines={1}>{fullName}</Text>
              <Text style={styles.cardEmail} numberOfLines={1}>{item.email}</Text>
              <View style={styles.cardBadgeRow}>
                <RoleBadge role={item.role} />
                {!item.is_active && (
                  <View style={styles.inactiveBadge}>
                    <Text style={styles.inactiveText}>Inactive</Text>
                  </View>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.gray300} />
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Users</Text>
          <Text style={styles.headerSub}>{users.length} total</Text>
        </View>
        <Button title="Add User" icon="add-outline" size="sm" onPress={() => setShowCreate(true)} />
      </View>

      {/* Search + role filter */}
      <View style={styles.filters}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={17} color={Colors.gray400} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor={Colors.gray400}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={17} color={Colors.gray400} />
            </TouchableOpacity>
          )}
        </View>
        <Select
          placeholder="Role"
          value={roleFilter}
          onValueChange={setRoleFilter}
          options={ROLE_OPTIONS}
          style={styles.roleSelect}
        />
      </View>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {loading && !refreshing ? (
        <Spinner fullScreen />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, users.length === 0 && { flex: 1 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="No users found"
              message={search || roleFilter ? 'Try adjusting your filters.' : 'Add your first user to get started.'}
              action={!search && !roleFilter ? { label: 'Add User', onPress: () => setShowCreate(true) } : undefined}
            />
          }
        />
      )}

      <UserFormModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onSaved={() => { setShowCreate(false); fetchUsers(); }}
      />

      {selected && (
        <UserDetailModal
          visible={showDetail}
          user={selected}
          onClose={() => setShowDetail(false)}
          onToggleActive={handleToggleActive}
          onDelete={handleDelete}
          onUpdated={() => { setShowDetail(false); fetchUsers(); }}
        />
      )}
    </SafeAreaView>
  );
};

// ─── Create User Modal ────────────────────────────────────────────────────────
const UserFormModal = ({ visible, onClose, onSaved, existing }) => {
  const [form, setForm] = useState({
    first_name: existing?.first_name || '',
    last_name:  existing?.last_name  || '',
    email:      existing?.email      || '',
    phone:      existing?.phone      || '',
    role:       existing?.role       || '',
    password:   '',
  });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const set = (f) => (v) => { setForm((p) => ({ ...p, [f]: v })); if (errors[f]) setErrors((p) => ({ ...p, [f]: '' })); };

  const validate = () => {
    const e = {};
    if (!form.first_name.trim()) e.first_name = 'Required';
    if (!form.last_name.trim())  e.last_name  = 'Required';
    if (!form.email.trim())      e.email      = 'Required';
    if (!form.role)              e.role       = 'Required';
    if (!existing && !form.password) e.password = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    setApiError('');
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (existing) await usersAPI.updateUser(existing.id, payload);
      else          await usersAPI.createUser(payload);
      onSaved();
    } catch (err) {
      setApiError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title={existing ? 'Edit User' : 'Add User'} size="lg">
      <ErrorBanner message={apiError} onDismiss={() => setApiError('')} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Input label="First Name" value={form.first_name} onChangeText={set('first_name')} error={errors.first_name} style={{ flex: 1 }} required />
        <Input label="Last Name"  value={form.last_name}  onChangeText={set('last_name')}  error={errors.last_name}  style={{ flex: 1 }} required />
      </View>
      <Input label="Email"  value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" error={errors.email} required />
      <Input label="Phone"  value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
      <Select label="Role"  value={form.role}  onValueChange={set('role')} options={CREATE_ROLE_OPTIONS} error={errors.role} required />
      {!existing && (
        <Input label="Password" value={form.password} onChangeText={set('password')} secureTextEntry error={errors.password} required />
      )}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Cancel" variant="outline" onPress={onClose} style={{ flex: 1 }} />
        <Button title={existing ? 'Save' : 'Create'} onPress={handleSave} loading={loading} style={{ flex: 1 }} />
      </View>
    </Modal>
  );
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const UserDetailModal = ({ visible, user, onClose, onToggleActive, onDelete, onUpdated }) => {
  const [showEdit, setShowEdit]           = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [delLoading, setDelLoading]       = useState(false);
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email;

  const doDelete = async () => {
    setDelLoading(true);
    await onDelete(user.id);
    setDelLoading(false);
  };

  if (showEdit) {
    return (
      <UserFormModal
        visible={visible}
        existing={user}
        onClose={() => setShowEdit(false)}
        onSaved={() => { setShowEdit(false); onUpdated(); }}
      />
    );
  }

  return (
    <Modal visible={visible} onClose={onClose} title="User Details" size="lg">
      {/* Avatar + name */}
      <View style={styles.detailTop}>
        <Avatar name={fullName} size={56} style={{ marginBottom: Spacing[2] }} />
        <Text style={styles.detailName}>{fullName}</Text>
        <RoleBadge role={user.role} />
      </View>

      <Divider />

      <DetailRow label="Email"    value={user.email} />
      <DetailRow label="Phone"    value={user.phone} />
      <DetailRow label="Facility" value={user.facility_name} />
      <DetailRow label="Status"   value={user.is_active ? 'Active' : 'Inactive'} valueColor={user.is_active ? Colors.success : Colors.danger} />
      <DetailRow label="Joined"   value={user.date_joined ? new Date(user.date_joined).toLocaleDateString() : undefined} />

      <Divider />

      {confirmDelete ? (
        <View style={styles.confirmBox}>
          <Text style={styles.confirmText}>Delete {fullName}? This cannot be undone.</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Cancel" variant="outline" size="sm" onPress={() => setConfirmDelete(false)} style={{ flex: 1 }} />
            <Button title="Delete" variant="danger"  size="sm" loading={delLoading} onPress={doDelete} style={{ flex: 1 }} />
          </View>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <Button title="Edit User" icon="create-outline" variant="outline" onPress={() => setShowEdit(true)} fullWidth />
          <Button
            title={user.is_active ? 'Deactivate User' : 'Activate User'}
            icon={user.is_active ? 'ban-outline' : 'checkmark-circle-outline'}
            variant={user.is_active ? 'outline' : 'success'}
            onPress={() => onToggleActive(user.id)}
            fullWidth
          />
          <Button title="Delete User" icon="trash-outline" variant="danger" onPress={() => setConfirmDelete(true)} fullWidth />
          <Button title="Close" variant="ghost" onPress={onClose} fullWidth />
        </View>
      )}
    </Modal>
  );
};

const DetailRow = ({ label, value, valueColor }) => {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.background },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  headerSub:   { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 1 },

  filters:    { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: Spacing[4], paddingTop: Spacing[3], gap: Spacing[2], backgroundColor: Colors.white },
  searchBox:  { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing[3], height: 44 },
  searchInput:{ flex: 1, fontSize: Typography.base, color: Colors.textPrimary },
  roleSelect: { width: 130, marginBottom: 0 },

  list: { padding: Spacing[4], paddingBottom: Spacing[10] },

  card:        { marginBottom: Spacing[2] },
  cardRow:     { flexDirection: 'row', alignItems: 'center' },
  cardInfo:    { flex: 1 },
  cardName:    { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  cardEmail:   { fontSize: Typography.xs, color: Colors.textSecondary, marginBottom: 4 },
  cardBadgeRow:{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  inactiveBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: Colors.gray200 },
  inactiveText:  { fontSize: Typography.xs, color: Colors.gray500, fontWeight: '600' },

  detailTop:  { alignItems: 'center', paddingVertical: Spacing[2] },
  detailName: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary, marginBottom: Spacing[2] },

  detailRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing[2], borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  detailLabel: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
  detailValue: { fontSize: Typography.sm, color: Colors.textPrimary },

  confirmBox:  { backgroundColor: Colors.dangerLight + '60', padding: Spacing[3], borderRadius: Radius.md, marginBottom: Spacing[3], gap: 10 },
  confirmText: { fontSize: Typography.sm, color: Colors.dangerDark },
});

export default UsersScreen;
