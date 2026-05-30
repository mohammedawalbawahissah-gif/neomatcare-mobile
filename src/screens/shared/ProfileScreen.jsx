import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../contexts/AuthContext';
import { authAPI, getErrorMessage } from '../../api/client';
import {
  Card, Button, Input, Avatar, RoleBadge,
  ErrorBanner, Divider, Modal,
} from '../../components/ui';
import Colors from '../../constants/colors';
import { Typography, Spacing, Radius } from '../../constants/theme';

const ProfileScreen = () => {
  const { user, logout, updateUser } = useAuth();

  const [showEditModal,     setShowEditModal]     = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [logoutLoading,     setLogoutLoading]     = useState(false);

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'User';

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          setLogoutLoading(true);
          await logout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar + name */}
        <Card style={styles.profileCard}>
          <View style={styles.profileTop}>
            <Avatar name={fullName} size={72} style={styles.avatar} />
            <Text style={styles.profileName}>{fullName}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <RoleBadge role={user?.role} />
          </View>
          <Divider />
          <View style={styles.profileActions}>
            <TouchableOpacity style={styles.profileAction} onPress={() => setShowEditModal(true)}>
              <Ionicons name="create-outline" size={18} color={Colors.primary} />
              <Text style={styles.profileActionText}>Edit Profile</Text>
            </TouchableOpacity>
            <View style={styles.profileActionDivider} />
            <TouchableOpacity style={styles.profileAction} onPress={() => setShowPasswordModal(true)}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.primary} />
              <Text style={styles.profileActionText}>Change Password</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Info */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          <InfoRow icon="person-outline"   label="First Name"  value={user?.first_name} />
          <InfoRow icon="person-outline"   label="Last Name"   value={user?.last_name} />
          <InfoRow icon="mail-outline"     label="Email"       value={user?.email} />
          <InfoRow icon="call-outline"     label="Phone"       value={user?.phone} />
          <InfoRow icon="briefcase-outline" label="Role"       value={user?.role?.replace(/_/g, ' ')} />
          <InfoRow icon="business-outline" label="Facility"    value={user?.facility_name} />
        </Card>

        {/* Danger zone */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Button
            title="Sign Out"
            variant="danger"
            icon="log-out-outline"
            onPress={handleLogout}
            loading={logoutLoading}
            fullWidth
          />
        </Card>
      </ScrollView>

      <EditProfileModal
        visible={showEditModal}
        user={user}
        onClose={() => setShowEditModal(false)}
        onSaved={(updated) => { setShowEditModal(false); updateUser(updated); }}
      />

      <ChangePasswordModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </SafeAreaView>
  );
};

// ─── Edit Profile Modal ───────────────────────────────────────────────────────
const EditProfileModal = ({ visible, user, onClose, onSaved }) => {
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name:  user?.last_name  || '',
    phone:      user?.phone      || '',
  });
  const [loading, setLoading]   = useState(false);
  const [apiError, setApiError] = useState('');
  const set = (f) => (v) => setForm((p) => ({ ...p, [f]: v }));

  const handleSave = async () => {
    setLoading(true);
    setApiError('');
    try {
      const res = await authAPI.updateProfile(form);
      onSaved(res.data);
    } catch (err) {
      setApiError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Edit Profile">
      <ErrorBanner message={apiError} onDismiss={() => setApiError('')} />
      <Input label="First Name" value={form.first_name} onChangeText={set('first_name')} required />
      <Input label="Last Name"  value={form.last_name}  onChangeText={set('last_name')}  required />
      <Input label="Phone"      value={form.phone}      onChangeText={set('phone')}      keyboardType="phone-pad" />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Cancel"       variant="outline" onPress={onClose}    style={{ flex: 1 }} />
        <Button title="Save Changes" onPress={handleSave} loading={loading} style={{ flex: 1 }} />
      </View>
    </Modal>
  );
};

// ─── Change Password Modal ────────────────────────────────────────────────────
const ChangePasswordModal = ({ visible, onClose }) => {
  const [form, setForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState(false);
  const set = (f) => (v) => { setForm((p) => ({ ...p, [f]: v })); if (errors[f]) setErrors((p) => ({ ...p, [f]: '' })); };

  const validate = () => {
    const e = {};
    if (!form.old_password)   e.old_password   = 'Current password is required';
    if (!form.new_password)   e.new_password   = 'New password is required';
    else if (form.new_password.length < 8) e.new_password = 'Min. 8 characters';
    if (form.new_password !== form.confirm_password) e.confirm_password = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = async () => {
    if (!validate()) return;
    setLoading(true);
    setApiError('');
    try {
      await authAPI.changePassword({ old_password: form.old_password, new_password: form.new_password });
      setSuccess(true);
      setForm({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setApiError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={() => { setSuccess(false); onClose(); }} title="Change Password">
      {success ? (
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
          <Text style={styles.successText}>Password changed successfully!</Text>
          <Button title="Close" onPress={() => { setSuccess(false); onClose(); }} fullWidth style={{ marginTop: Spacing[4] }} />
        </View>
      ) : (
        <>
          <ErrorBanner message={apiError} onDismiss={() => setApiError('')} />
          <Input label="Current Password" value={form.old_password}     onChangeText={set('old_password')}     secureTextEntry error={errors.old_password} required />
          <Input label="New Password"     value={form.new_password}     onChangeText={set('new_password')}     secureTextEntry error={errors.new_password} required />
          <Input label="Confirm Password" value={form.confirm_password} onChangeText={set('confirm_password')} secureTextEntry error={errors.confirm_password} required />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Cancel"          variant="outline" onPress={onClose}          style={{ flex: 1 }} />
            <Button title="Change Password" onPress={handleChange} loading={loading}     style={{ flex: 1 }} />
          </View>
        </>
      )}
    </Modal>
  );
};

const InfoRow = ({ icon, label, value }) => {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={15} color={Colors.textMuted} style={{ marginRight: 8, width: 20 }} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.background },
  header:      { paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  scroll:      { padding: Spacing[4], paddingBottom: Spacing[10] },

  profileCard:    { marginBottom: Spacing[4] },
  profileTop:     { alignItems: 'center', paddingVertical: Spacing[4] },
  avatar:         { marginBottom: Spacing[3] },
  profileName:    { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary, marginBottom: 4 },
  profileEmail:   { fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: Spacing[2] },
  profileActions: { flexDirection: 'row', paddingVertical: Spacing[2] },
  profileAction:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing[2] },
  profileActionText: { fontSize: Typography.sm, color: Colors.primary, fontWeight: Typography.medium },
  profileActionDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },

  section:      { marginBottom: Spacing[4] },
  sectionTitle: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary, marginBottom: Spacing[3] },

  infoRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing[2], borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  infoLabel: { fontSize: Typography.sm, color: Colors.textSecondary, width: 100 },
  infoValue: { fontSize: Typography.sm, color: Colors.textPrimary, flex: 1, textTransform: 'capitalize' },

  successBox:  { alignItems: 'center', paddingVertical: Spacing[4] },
  successText: { fontSize: Typography.base, color: Colors.success, fontWeight: Typography.medium, marginTop: Spacing[3], textAlign: 'center' },
});

export default ProfileScreen;
