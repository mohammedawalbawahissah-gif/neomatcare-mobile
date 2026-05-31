/**
 * screens/superadmin/UsersScreen.jsx
 * Original NeoMatCare users UI — restored with new search/filter/CRUD logic.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, RefreshControl, ActivityIndicator, Alert, Modal, ScrollView,
} from 'react-native';
import { usersAPI, getErrorMessage } from '../../api/client';

const ROLES = [
  { value: 'health_worker',  label: 'Health Worker',  needsFacility: true },
  { value: 'facility_admin', label: 'Facility Admin',  needsFacility: true },
  { value: 'specialist',     label: 'Specialist',      needsFacility: false },
  { value: 'driver',         label: 'Driver',          needsFacility: true },
  { value: 'superadmin',     label: 'Superadmin',      needsFacility: false },
];

const ROLE_COLORS = {
  health_worker:  { bg: '#dcfce7', text: '#16a34a' },
  facility_admin: { bg: '#dbeafe', text: '#2563eb' },
  specialist:     { bg: '#ede9fe', text: '#7c3aed' },
  driver:         { bg: '#fef3c7', text: '#d97706' },
  superadmin:     { bg: '#fee2e2', text: '#dc2626' },
};

const ROLE_FILTER_OPTIONS = ['all', 'health_worker', 'facility_admin', 'specialist', 'driver', 'superadmin'];

export default function UsersScreen() {
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [selected,   setSelected]   = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const load = useCallback(async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (roleFilter !== 'all') params.role = roleFilter;
      const res = await usersAPI.getUsers(params);
      setUsers(Array.isArray(res.data) ? res.data : res.data?.results || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [search, roleFilter]);

  useEffect(() => {
    const t = setTimeout(load, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [load]);

  const handleToggleActive = async (id) => {
    try { await usersAPI.toggleUserActive(id); load(); setShowDetail(false); }
    catch (err) { Alert.alert('Error', getErrorMessage(err)); }
  };

  const handleDelete = async (id) => {
    try { await usersAPI.deleteUser(id); setShowDetail(false); load(); }
    catch (err) { Alert.alert('Error', getErrorMessage(err)); }
  };

  const renderItem = ({ item }) => {
    const fullName = item.name || [item.first_name, item.last_name].filter(Boolean).join(' ') || item.email;
    const c = ROLE_COLORS[item.role] || ROLE_COLORS.health_worker;
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => { setSelected(item); setShowDetail(true); }}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{fullName[0]?.toUpperCase() || 'U'}</Text>
        </View>
        <View style={styles.rowInfo}>
          <Text style={styles.rowName}>{fullName}</Text>
          <Text style={styles.rowEmail}>{item.email}</Text>
          {item.facility_name && <Text style={styles.rowFacility}>📍 {item.facility_name}</Text>}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <View style={[styles.rolePill, { backgroundColor: c.bg }]}>
              <Text style={[styles.roleText, { color: c.text }]}>{item.role?.replace(/_/g, ' ')}</Text>
            </View>
            {item.is_active === false && (
              <View style={styles.inactivePill}>
                <Text style={styles.inactiveText}>Inactive</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) return <ActivityIndicator style={styles.loader} color="#16a34a" />;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Users</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Role filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsWrap} contentContainerStyle={styles.tabs}>
        {ROLE_FILTER_OPTIONS.map(r => (
          <TouchableOpacity
            key={r}
            style={[styles.tab, roleFilter === r && styles.tabActive]}
            onPress={() => setRoleFilter(r)}
          >
            <Text style={[styles.tabText, roleFilter === r && styles.tabTextActive]}>
              {r === 'all' ? 'All' : r.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={users}
        keyExtractor={u => String(u.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#16a34a" />}
        ListEmptyComponent={<Text style={styles.empty}>No users found.</Text>}
      />

      <UserFormModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onSaved={() => { setShowCreate(false); load(); }}
      />

      {selected && (
        <UserDetailModal
          visible={showDetail}
          user={selected}
          onClose={() => setShowDetail(false)}
          onToggleActive={handleToggleActive}
          onDelete={handleDelete}
          onUpdated={() => { setShowDetail(false); load(); }}
        />
      )}
    </View>
  );
}

// ── User Form Modal ────────────────────────────────────────────────────────────
function UserFormModal({ visible, onClose, onSaved, existing }) {
  const [form, setForm] = useState({
    first_name: existing?.first_name || '',
    last_name:  existing?.last_name  || '',
    email:      existing?.email      || '',
    phone:      existing?.phone      || '',
    role:       existing?.role       || 'health_worker',
    password:   '',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const set = (f) => (v) => setForm(p => ({ ...p, [f]: v }));

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim() || !form.role) {
      Alert.alert('Required', 'Name, email and role are required.'); return;
    }
    if (!existing && !form.password) {
      Alert.alert('Required', 'Password is required for new users.'); return;
    }
    setLoading(true); setError('');
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (existing) await usersAPI.updateUser(existing.id, payload);
      else          await usersAPI.createUser(payload);
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView style={styles.modal} keyboardShouldPersistTaps="handled">
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{existing ? 'Edit User' : 'New User'}</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
        </View>
        {error ? <View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View> : null}

        <View style={styles.halfRow}>
          <View style={{ flex: 1 }}><MField label="First Name *" value={form.first_name} onChange={set('first_name')} placeholder="John" /></View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}><MField label="Last Name *"  value={form.last_name}  onChange={set('last_name')}  placeholder="Doe" /></View>
        </View>
        <MField label="Email *" value={form.email} onChange={set('email')} placeholder="user@facility.org" keyboard="email-address" />
        <MField label="Phone"   value={form.phone} onChange={set('phone')} placeholder="+233 XX XXX XXXX"  keyboard="phone-pad" />

        <Text style={styles.mlabel}>Role</Text>
        <View style={styles.roleGrid}>
          {ROLES.map(r => (
            <TouchableOpacity
              key={r.value}
              style={[styles.roleChip, form.role === r.value && styles.roleChipActive]}
              onPress={() => set('role')(r.value)}
            >
              <Text style={[styles.roleChipText, form.role === r.value && styles.roleChipTextActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {!existing && (
          <MField label="Password *" value={form.password} onChange={set('password')} placeholder="Min. 8 characters" secure />
        )}

        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.outlineBtn, { flex: 1 }]} onPress={onClose}>
            <Text style={styles.outlineBtnText}>Cancel</Text>
          </TouchableOpacity>
          <View style={{ width: 12 }} />
          <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }, loading && { opacity: 0.6 }]} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryBtnText}>{existing ? 'Save' : 'Create User'}</Text>}
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </Modal>
  );
}

// ── User Detail Modal ──────────────────────────────────────────────────────────
function UserDetailModal({ visible, user, onClose, onToggleActive, onDelete, onUpdated }) {
  const [showEdit,       setShowEdit]       = useState(false);
  const [confirmDelete,  setConfirmDelete]  = useState(false);
  const [delLoading,     setDelLoading]     = useState(false);

  const fullName = user.name || [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email;
  const c = ROLE_COLORS[user.role] || ROLE_COLORS.health_worker;

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
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>User Details</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
        </View>

        {/* Avatar + name */}
        <View style={styles.detailTop}>
          <View style={[styles.detailAvatar, { backgroundColor: c.text }]}>
            <Text style={styles.detailAvatarText}>{fullName[0]?.toUpperCase() || 'U'}</Text>
          </View>
          <Text style={styles.detailName}>{fullName}</Text>
          <View style={[styles.rolePill, { backgroundColor: c.bg }]}>
            <Text style={[styles.roleText, { color: c.text }]}>{user.role?.replace(/_/g, ' ')}</Text>
          </View>
        </View>

        <View style={styles.detailSection}>
          <DRow label="Email"    value={user.email} />
          <DRow label="Phone"    value={user.phone} />
          <DRow label="Facility" value={user.facility_name} />
          <DRow label="Status"   value={user.is_active !== false ? 'Active' : 'Inactive'}
                                 valueColor={user.is_active !== false ? '#16a34a' : '#dc2626'} />
          {user.date_joined && <DRow label="Joined" value={new Date(user.date_joined).toLocaleDateString()} />}
        </View>

        {confirmDelete ? (
          <View style={styles.confirmBox}>
            <Text style={styles.confirmText}>Delete {fullName}? This cannot be undone.</Text>
            <View style={styles.btnRow}>
              <TouchableOpacity style={[styles.outlineBtn, { flex: 1 }]} onPress={() => setConfirmDelete(false)}>
                <Text style={styles.outlineBtnText}>Cancel</Text>
              </TouchableOpacity>
              <View style={{ width: 12 }} />
              <TouchableOpacity
                style={[styles.dangerBtn, { flex: 1 }, delLoading && { opacity: 0.6 }]}
                onPress={async () => { setDelLoading(true); await onDelete(user.id); setDelLoading(false); }}
                disabled={delLoading}
              >
                {delLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryBtnText}>Delete</Text>}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.detailActions}>
            <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowEdit(true)}>
              <Text style={styles.outlineBtnText}>Edit User</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.outlineBtn, { marginTop: 10 }]}
              onPress={() => onToggleActive(user.id)}
            >
              <Text style={styles.outlineBtnText}>
                {user.is_active !== false ? 'Deactivate User' : 'Activate User'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.dangerBtn, { marginTop: 10 }]} onPress={() => setConfirmDelete(true)}>
              <Text style={styles.primaryBtnText}>Delete User</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </Modal>
  );
}

function DRow({ label, value, valueColor }) {
  if (!value) return null;
  return (
    <View style={styles.drow}>
      <Text style={styles.drowLabel}>{label}</Text>
      <Text style={[styles.drowValue, valueColor && { color: valueColor }]}>{String(value)}</Text>
    </View>
  );
}

function MField({ label, value, onChange, placeholder, keyboard, secure }) {
  return (
    <>
      <Text style={styles.mlabel}>{label}</Text>
      <TextInput
        style={styles.minput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboard || 'default'}
        secureTextEntry={secure}
        autoCapitalize="none"
      />
    </>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f8fafc' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 56, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  title:       { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  addBtn:      { backgroundColor: '#16a34a', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText:  { color: '#fff', fontWeight: '700', fontSize: 13 },
  searchWrap:  { flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 8, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14 },
  searchInput: { flex: 1, fontSize: 15, color: '#0f172a', paddingVertical: 12 },
  clearBtn:    { padding: 4 },
  clearBtnText:{ fontSize: 14, color: '#94a3b8' },
  tabsWrap:    { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tabs:        { paddingHorizontal: 16, paddingVertical: 8, gap: 8, flexDirection: 'row' },
  tab:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#f1f5f9' },
  tabActive:   { backgroundColor: '#16a34a' },
  tabText:     { fontSize: 12, fontWeight: '600', color: '#64748b' },
  tabTextActive:{ color: '#fff' },
  list:        { padding: 16, gap: 10 },
  loader:      { flex: 1, marginTop: 60 },
  row:         { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:      { width: 40, height: 40, borderRadius: 20, backgroundColor: '#16a34a', justifyContent: 'center', alignItems: 'center' },
  avatarText:  { color: '#fff', fontWeight: '700', fontSize: 16 },
  rowInfo:     { flex: 1 },
  rowName:     { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  rowEmail:    { fontSize: 12, color: '#64748b', marginTop: 1 },
  rowFacility: { fontSize: 11, color: '#64748b', marginTop: 1 },
  rolePill:    { alignSelf: 'flex-start', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  roleText:    { fontSize: 10, fontWeight: '700' },
  inactivePill:{ backgroundColor: '#e2e8f0', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  inactiveText:{ fontSize: 10, fontWeight: '700', color: '#64748b' },
  chevron:     { fontSize: 20, color: '#cbd5e1' },
  empty:       { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
  modal:       { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 20 },
  modalTitle:  { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  modalClose:  { fontSize: 22, color: '#64748b', padding: 4 },
  mlabel:      { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 14, marginBottom: 6 },
  minput:      { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0f172a', backgroundColor: '#fff' },
  halfRow:     { flexDirection: 'row' },
  roleGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  roleChip:           { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  roleChipActive:     { borderColor: '#16a34a', backgroundColor: '#dcfce7' },
  roleChipText:       { fontSize: 13, color: '#64748b', fontWeight: '500' },
  roleChipTextActive: { color: '#16a34a', fontWeight: '700' },
  errorBanner: { backgroundColor: '#fee2e2', borderRadius: 8, padding: 12, marginBottom: 12 },
  errorText:   { fontSize: 13, color: '#dc2626' },
  btnRow:      { flexDirection: 'row', marginTop: 24 },
  primaryBtn:  { backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText:{ color: '#fff', fontWeight: '700', fontSize: 14 },
  outlineBtn:  { borderWidth: 1.5, borderColor: '#16a34a', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  outlineBtnText:{ color: '#16a34a', fontWeight: '700', fontSize: 14 },
  dangerBtn:   { backgroundColor: '#dc2626', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  detailTop:   { alignItems: 'center', paddingVertical: 16, marginBottom: 8 },
  detailAvatar:{ width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  detailAvatarText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  detailName:  { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  detailSection:{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  drow:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  drowLabel:   { fontSize: 13, color: '#64748b', fontWeight: '500' },
  drowValue:   { fontSize: 13, color: '#0f172a', fontWeight: '600' },
  detailActions:{ marginBottom: 16 },
  confirmBox:  { backgroundColor: '#fee2e2', borderRadius: 10, padding: 16, marginBottom: 16 },
  confirmText: { fontSize: 13, color: '#dc2626', marginBottom: 12 },
});
