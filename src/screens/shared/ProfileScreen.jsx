/**
 * screens/shared/ProfileScreen.jsx
 * Original NeoMatCare profile UI — restored with edit/password modals from revamp.
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ScrollView, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI, getErrorMessage } from '../../api/client';

const ROLE_LABELS = {
  health_worker:  'Health Worker',
  facility_admin: 'Facility Admin',
  specialist:     'Specialist',
  driver:         'Driver',
  superadmin:     'Superadmin',
};

const ROLE_COLORS = {
  health_worker:  '#16a34a',
  facility_admin: '#2563eb',
  specialist:     '#7c3aed',
  driver:         '#d97706',
  superadmin:     '#dc2626',
};

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuth();

  const [showEdit,     setShowEdit]     = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const fullName = user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'User';
  const color    = ROLE_COLORS[user?.role] || '#64748b';

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={[styles.avatar, { backgroundColor: color }]}>
          <Text style={styles.avatarText}>{fullName[0]?.toUpperCase() || 'U'}</Text>
        </View>
        <Text style={styles.name}>{fullName}</Text>
        <View style={[styles.roleBadge, { backgroundColor: color + '20' }]}>
          <Text style={[styles.roleText, { color }]}>{ROLE_LABELS[user?.role]}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.section}>
        <InfoRow label="Email"    value={user?.email} />
        <InfoRow label="Phone"    value={user?.phone} />
        <InfoRow label="Role"     value={ROLE_LABELS[user?.role]} />
        {user?.facility_name && <InfoRow label="Facility" value={user.facility_name} />}
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.actionRow} onPress={() => setShowEdit(true)}>
          <Text style={styles.actionText}>Edit Profile</Text>
          <Text style={styles.actionChevron}>›</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.actionRow} onPress={() => setShowPassword(true)}>
          <Text style={styles.actionText}>Change Password</Text>
          <Text style={styles.actionChevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <EditProfileModal
        visible={showEdit}
        user={user}
        onClose={() => setShowEdit(false)}
        onSaved={(updated) => { setShowEdit(false); updateUser(updated); }}
      />
      <ChangePasswordModal
        visible={showPassword}
        onClose={() => setShowPassword(false)}
      />
    </ScrollView>
  );
}

// ── Edit Profile Modal ─────────────────────────────────────────────────────────
function EditProfileModal({ visible, user, onClose, onSaved }) {
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name:  user?.last_name  || '',
    email:      user?.email      || '',
    phone:      user?.phone      || '',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const set = (f) => (v) => setForm(p => ({ ...p, [f]: v }));

  const handleSave = async () => {
    setLoading(true); setError('');
    try {
      const res = await authAPI.updateProfile(form);
      onSaved(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Edit Profile</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
        </View>
        {error ? <View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View> : null}
        <MField label="First Name" value={form.first_name} onChange={set('first_name')} placeholder="First name" />
        <MField label="Last Name"  value={form.last_name}  onChange={set('last_name')}  placeholder="Last name" />
        <MField label="Email"      value={form.email}      onChange={set('email')}      placeholder="email@example.com" keyboard="email-address" />
        <MField label="Phone"      value={form.phone}      onChange={set('phone')}      placeholder="+233 XX XXX XXXX" keyboard="phone-pad" />
        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.outlineBtn, { flex: 1 }]} onPress={onClose}>
            <Text style={styles.outlineBtnText}>Cancel</Text>
          </TouchableOpacity>
          <View style={{ width: 12 }} />
          <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }, loading && { opacity: 0.6 }]} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryBtnText}>Save Changes</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Change Password Modal ──────────────────────────────────────────────────────
function ChangePasswordModal({ visible, onClose }) {
  const [form, setForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);
  const set = (f) => (v) => setForm(p => ({ ...p, [f]: v }));

  const handleChange = async () => {
    if (!form.old_password || !form.new_password || !form.confirm_password) {
      setError('All fields are required.'); return;
    }
    if (form.new_password.length < 8) {
      setError('New password must be at least 8 characters.'); return;
    }
    if (form.new_password !== form.confirm_password) {
      setError('Passwords do not match.'); return;
    }
    setLoading(true); setError('');
    try {
      await authAPI.changePassword({ old_password: form.old_password, new_password: form.new_password });
      setSuccess(true);
      setForm({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Change Password</Text>
          <TouchableOpacity onPress={() => { setSuccess(false); onClose(); }}>
            <Text style={styles.modalClose}>✕</Text>
          </TouchableOpacity>
        </View>
        {success ? (
          <View style={styles.successBox}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successText}>Password changed successfully!</Text>
            <TouchableOpacity style={[styles.primaryBtn, { marginTop: 24 }]} onPress={() => { setSuccess(false); onClose(); }}>
              <Text style={styles.primaryBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {error ? <View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View> : null}
            <MField label="Current Password" value={form.old_password}     onChange={set('old_password')}     placeholder="Current password"  secure />
            <MField label="New Password"     value={form.new_password}     onChange={set('new_password')}     placeholder="Min. 8 characters" secure />
            <MField label="Confirm Password" value={form.confirm_password} onChange={set('confirm_password')} placeholder="Re-enter password"  secure />
            <View style={styles.btnRow}>
              <TouchableOpacity style={[styles.outlineBtn, { flex: 1 }]} onPress={onClose}>
                <Text style={styles.outlineBtnText}>Cancel</Text>
              </TouchableOpacity>
              <View style={{ width: 12 }} />
              <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }, loading && { opacity: 0.6 }]} onPress={handleChange} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryBtnText}>Change Password</Text>}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
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
  container:    { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  title:        { fontSize: 20, fontWeight: '700', color: '#0f172a', paddingTop: 48, marginBottom: 24 },
  avatarSection:{ alignItems: 'center', marginBottom: 24 },
  avatar:       { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText:   { color: '#fff', fontSize: 28, fontWeight: '700' },
  name:         { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  roleBadge:    { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  roleText:     { fontSize: 12, fontWeight: '700' },
  section:      { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 },
  row:          { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  rowLabel:     { fontSize: 14, color: '#64748b', fontWeight: '600' },
  rowValue:     { fontSize: 14, color: '#0f172a', maxWidth: '60%', textAlign: 'right' },
  actionRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  actionText:   { fontSize: 14, color: '#0f172a', fontWeight: '500' },
  actionChevron:{ fontSize: 20, color: '#cbd5e1' },
  divider:      { height: 1, backgroundColor: '#f1f5f9' },
  logoutBtn:    { backgroundColor: '#fee2e2', borderRadius: 12, padding: 16, alignItems: 'center' },
  logoutText:   { color: '#dc2626', fontWeight: '700', fontSize: 15 },
  modal:        { flex: 1, backgroundColor: '#f8fafc', padding: 20, paddingTop: 0 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 56, marginBottom: 24 },
  modalTitle:   { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  modalClose:   { fontSize: 22, color: '#64748b', padding: 4 },
  mlabel:       { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 14, marginBottom: 6 },
  minput:       { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0f172a', backgroundColor: '#fff' },
  errorBanner:  { backgroundColor: '#fee2e2', borderRadius: 8, padding: 12, marginBottom: 12 },
  errorText:    { fontSize: 13, color: '#dc2626' },
  btnRow:       { flexDirection: 'row', marginTop: 24 },
  primaryBtn:   { backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText:{ color: '#fff', fontWeight: '700', fontSize: 15 },
  outlineBtn:   { borderWidth: 1.5, borderColor: '#16a34a', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  outlineBtnText:{ color: '#16a34a', fontWeight: '700', fontSize: 15 },
  successBox:   { alignItems: 'center', paddingTop: 40 },
  successIcon:  { fontSize: 48, color: '#16a34a' },
  successText:  { fontSize: 15, color: '#16a34a', fontWeight: '600', marginTop: 12, textAlign: 'center' },
});
