/**
 * screens/auth/RegisterScreen.jsx
 * Original NeoMatCare register UI — restored, with new register logic.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, Modal, FlatList,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { facilitiesAPI } from '../../api/client';

const ROLES = [
  { value: 'health_worker',  label: 'Health Worker',  needsFacility: true },
  { value: 'facility_admin', label: 'Facility Admin',  needsFacility: true },
  { value: 'specialist',     label: 'Specialist',      needsFacility: false },
  { value: 'driver',         label: 'Driver',          needsFacility: true },
  { value: 'superadmin',     label: 'Superadmin',      needsFacility: false },
];

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    phone: '', role: 'health_worker', facility: '',
    password: '', confirm_password: '',
  });
  const [facilities,        setFacilities]        = useState([]);
  const [facilitiesLoading, setFacilitiesLoading] = useState(false);
  const [showFacilityPicker, setShowFacilityPicker] = useState(false);
  const [loading,  setLoading]  = useState(false);

  const selectedRole     = ROLES.find(r => r.value === form.role);
  const needsFacility    = selectedRole?.needsFacility;
  const selectedFacility = facilities.find(f => f.id === form.facility);

  useEffect(() => {
    if (!needsFacility) { setFacilities([]); setForm(p => ({ ...p, facility: '' })); return; }
    let cancelled = false;
    setFacilitiesLoading(true);
    facilitiesAPI.getFacilities()
      .then(({ data }) => { if (!cancelled) setFacilities(Array.isArray(data) ? data : data.results || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setFacilitiesLoading(false); });
    return () => { cancelled = true; };
  }, [form.role]);

  const set = (field) => (value) => setForm(p => ({ ...p, [field]: value }));

  const handleRegister = async () => {
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim() || !form.password) {
      Alert.alert('Required', 'Please fill in all required fields.'); return;
    }
    if (needsFacility && !form.facility) {
      Alert.alert('Required', `Please select a facility for the ${selectedRole?.label} role.`); return;
    }
    if (form.password !== form.confirm_password) {
      Alert.alert('Error', 'Passwords do not match.'); return;
    }
    if (form.password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters.'); return;
    }
    setLoading(true);
    const payload = {
      name: `${form.first_name.trim()} ${form.last_name.trim()}`,
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      role: form.role,
      password: form.password,
      password2: form.confirm_password,
    };
    if (form.facility) payload.facility = form.facility;
    const result = await register(payload);
    setLoading(false);
    if (!result.success) {
      Alert.alert('Registration failed', result.error || 'Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.logoRow}>
            <View style={styles.logoDot} />
            <Text style={styles.logoText}>NeoMatCare</Text>
          </View>
          <Text style={styles.subtitle}>Create your account</Text>

          {/* Name row */}
          <View style={styles.nameRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput style={styles.input} value={form.first_name} onChangeText={set('first_name')} placeholder="John" placeholderTextColor="#94a3b8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput style={styles.input} value={form.last_name} onChangeText={set('last_name')} placeholder="Doe" placeholderTextColor="#94a3b8" />
            </View>
          </View>

          <Text style={styles.label}>Email *</Text>
          <TextInput style={styles.input} value={form.email} onChangeText={set('email')} placeholder="you@facility.org" placeholderTextColor="#94a3b8" autoCapitalize="none" keyboardType="email-address" />

          <Text style={styles.label}>Phone</Text>
          <TextInput style={styles.input} value={form.phone} onChangeText={set('phone')} placeholder="+233 XX XXX XXXX" placeholderTextColor="#94a3b8" keyboardType="phone-pad" />

          <Text style={styles.label}>Role</Text>
          <View style={styles.roleGrid}>
            {ROLES.map(r => (
              <TouchableOpacity
                key={r.value}
                style={[styles.roleChip, form.role === r.value && styles.roleChipActive]}
                onPress={() => { set('role')(r.value); set('facility')(''); }}
              >
                <Text style={[styles.roleChipText, form.role === r.value && styles.roleChipTextActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {needsFacility && (
            <>
              <Text style={styles.label}>Facility *</Text>
              {facilitiesLoading ? (
                <View style={styles.facilityLoading}>
                  <ActivityIndicator size="small" color="#16a34a" />
                  <Text style={styles.facilityLoadingText}>Loading facilities…</Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.facilityPicker} onPress={() => setShowFacilityPicker(true)}>
                  <Text style={[styles.facilityPickerText, !form.facility && { color: '#94a3b8' }]}>
                    {selectedFacility ? selectedFacility.name : 'Select facility…'}
                  </Text>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          <Text style={styles.label}>Password *</Text>
          <TextInput style={styles.input} value={form.password} onChangeText={set('password')} placeholder="Min. 8 characters" placeholderTextColor="#94a3b8" secureTextEntry />

          <Text style={styles.label}>Confirm Password *</Text>
          <TextInput style={styles.input} value={form.confirm_password} onChangeText={set('confirm_password')} placeholder="Re-enter password" placeholderTextColor="#94a3b8" secureTextEntry />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Account</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Facility picker modal */}
      <Modal visible={showFacilityPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.pickerModal}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select Facility</Text>
            <TouchableOpacity onPress={() => setShowFacilityPicker(false)}>
              <Text style={styles.pickerClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={facilities}
            keyExtractor={f => f.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.facilityRow, form.facility === item.id && styles.facilityRowActive]}
                onPress={() => { set('facility')(item.id); setShowFacilityPicker(false); }}
              >
                <View>
                  <Text style={styles.facilityName}>{item.name}</Text>
                  <Text style={styles.facilitySub}>Level {item.level} · {item.district || item.region || '—'}</Text>
                </View>
                {form.facility === item.id && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.empty}>No facilities found.</Text>}
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll:    { flexGrow: 1, padding: 24, paddingTop: 40 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 28,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  logoRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  logoDot:  { width: 10, height: 10, borderRadius: 5, backgroundColor: '#16a34a', marginRight: 8 },
  logoText: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginBottom: 24 },
  nameRow:  { flexDirection: 'row' },
  label:    { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0f172a',
  },
  roleGrid:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  roleChip:           { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  roleChipActive:     { borderColor: '#16a34a', backgroundColor: '#dcfce7' },
  roleChipText:       { fontSize: 13, color: '#64748b', fontWeight: '500' },
  roleChipTextActive: { color: '#16a34a', fontWeight: '700' },
  facilityLoading:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 8 },
  facilityLoadingText: { fontSize: 13, color: '#64748b' },
  facilityPicker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff',
  },
  facilityPickerText: { fontSize: 15, color: '#0f172a', flex: 1 },
  chevron:            { fontSize: 20, color: '#94a3b8' },
  btn:         { backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: '#fff', fontWeight: '700', fontSize: 15 },
  footer:     { flexDirection: 'row', justifyContent: 'center', marginTop: 24, marginBottom: 16 },
  footerText: { fontSize: 13, color: '#64748b' },
  footerLink: { fontSize: 13, color: '#16a34a', fontWeight: '600' },
  pickerModal:  { flex: 1, backgroundColor: '#f8fafc' },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  pickerTitle:  { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  pickerClose:  { fontSize: 20, color: '#64748b', padding: 4 },
  facilityRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#fff' },
  facilityRowActive: { backgroundColor: '#f0fdf4' },
  facilityName:      { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  facilitySub:       { fontSize: 12, color: '#64748b', marginTop: 2 },
  checkmark:         { fontSize: 18, color: '#16a34a', fontWeight: '700' },
  empty:             { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
});
