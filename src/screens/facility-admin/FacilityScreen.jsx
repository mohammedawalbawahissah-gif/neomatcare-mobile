/**
 * screens/facility-admin/FacilityScreen.jsx
 * Original NeoMatCare facility admin UI — restored with new logic.
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl, Modal, TextInput,
} from 'react-native';
import { facilitiesAPI, getErrorMessage } from '../../api/client';

const FACILITY_TYPES = [
  { value: 'hospital',       label: 'Hospital' },
  { value: 'clinic',         label: 'Clinic' },
  { value: 'health_center',  label: 'Health Center' },
  { value: 'maternity_home', label: 'Maternity Home' },
];

export default function FacilityScreen() {
  const [facility,   setFacility]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showEdit,   setShowEdit]   = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await facilitiesAPI.getMyFacility();
      setFacility(res.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <ActivityIndicator style={styles.loader} color="#16a34a" />;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#16a34a" />}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>My Facility</Text>
        {facility && (
          <TouchableOpacity style={styles.editBtn} onPress={() => setShowEdit(true)}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {!facility ? (
        <Text style={styles.empty}>No facility information found.</Text>
      ) : (
        <>
          {/* Stats */}
          <View style={styles.statsRow}>
            <StatCard label="Total Staff"   value={facility.staff_count} color="#16a34a" />
            <StatCard label="Active Cases"  value={facility.active_cases} color="#2563eb" />
            <StatCard label="Bed Capacity"  value={facility.capacity} color="#d97706" />
          </View>

          {/* Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Facility Information</Text>
            <InfoRow label="Name"    value={facility.name} />
            <InfoRow label="Type"    value={facility.facility_type?.replace(/_/g, ' ')} />
            <InfoRow label="Address" value={facility.address} />
            <InfoRow label="Region"  value={facility.region} />
            <InfoRow label="Phone"   value={facility.phone} />
            <InfoRow label="Email"   value={facility.email} />
            {facility.website && <InfoRow label="Website" value={facility.website} />}
          </View>

          {/* Staff */}
          {facility.staff?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Staff ({facility.staff.length})</Text>
              {facility.staff.map((member, i) => {
                const name = member.name || [member.first_name, member.last_name].filter(Boolean).join(' ') || member.email;
                return (
                  <View key={member.id || i} style={styles.staffRow}>
                    <View style={styles.staffAvatar}>
                      <Text style={styles.staffInitial}>{(name[0] || '?').toUpperCase()}</Text>
                    </View>
                    <View style={styles.staffInfo}>
                      <Text style={styles.staffName}>{name}</Text>
                      <Text style={styles.staffRole}>{member.role?.replace(/_/g, ' ')}</Text>
                    </View>
                    <View style={[styles.activeDot, { backgroundColor: member.is_active !== false ? '#16a34a' : '#d1d5db' }]} />
                  </View>
                );
              })}
            </View>
          )}

          {/* Services */}
          {facility.services?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Services Offered</Text>
              <View style={styles.servicesRow}>
                {facility.services.map((s, i) => (
                  <View key={i} style={styles.serviceChip}>
                    <Text style={styles.serviceChipText}>{s}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </>
      )}

      {facility && (
        <EditFacilityModal
          visible={showEdit}
          facility={facility}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); load(); }}
        />
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function StatCard({ label, value, color }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value ?? '—'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

// ── Edit Facility Modal ────────────────────────────────────────────────────────
function EditFacilityModal({ visible, facility, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:          facility?.name          || '',
    facility_type: facility?.facility_type || '',
    address:       facility?.address       || '',
    region:        facility?.region        || '',
    phone:         facility?.phone         || '',
    email:         facility?.email         || '',
    website:       facility?.website       || '',
    capacity:      facility?.capacity ? String(facility.capacity) : '',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const set = (f) => (v) => setForm(p => ({ ...p, [f]: v }));

  const handleSave = async () => {
    setLoading(true); setError('');
    try {
      await facilitiesAPI.updateMyFacility({ ...form, capacity: form.capacity ? Number(form.capacity) : undefined });
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView style={styles.modal} keyboardShouldPersistTaps="handled">
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Edit Facility</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
        </View>
        {error ? <View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View> : null}

        <MField label="Facility Name" value={form.name}    onChange={set('name')}    placeholder="Facility name" />

        <Text style={styles.mlabel}>Facility Type</Text>
        <View style={styles.typeGrid}>
          {FACILITY_TYPES.map(t => (
            <TouchableOpacity
              key={t.value}
              style={[styles.typeChip, form.facility_type === t.value && styles.typeChipActive]}
              onPress={() => set('facility_type')(t.value)}
            >
              <Text style={[styles.typeChipText, form.facility_type === t.value && styles.typeChipTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <MField label="Address"      value={form.address}  onChange={set('address')}  placeholder="Street address" />
        <MField label="Region"       value={form.region}   onChange={set('region')}   placeholder="e.g. Greater Accra" />
        <MField label="Phone"        value={form.phone}    onChange={set('phone')}    placeholder="+233 XX XXX XXXX" keyboard="phone-pad" />
        <MField label="Email"        value={form.email}    onChange={set('email')}    placeholder="facility@health.gh" keyboard="email-address" />
        <MField label="Website"      value={form.website}  onChange={set('website')}  placeholder="https://..." />
        <MField label="Bed Capacity" value={form.capacity} onChange={set('capacity')} placeholder="e.g. 120" keyboard="numeric" />

        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.outlineBtn, { flex: 1 }]} onPress={onClose}>
            <Text style={styles.outlineBtnText}>Cancel</Text>
          </TouchableOpacity>
          <View style={{ width: 12 }} />
          <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }, loading && { opacity: 0.6 }]} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryBtnText}>Save Changes</Text>}
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </Modal>
  );
}

function MField({ label, value, onChange, placeholder, keyboard }) {
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
        autoCapitalize="none"
      />
    </>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f8fafc' },
  loader:      { flex: 1, marginTop: 60 },
  headerRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56 },
  title:       { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  editBtn:     { borderWidth: 1.5, borderColor: '#16a34a', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  editBtnText: { color: '#16a34a', fontWeight: '600', fontSize: 13 },
  statsRow:    { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  statCard:    { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderLeftWidth: 3, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  statValue:   { fontSize: 22, fontWeight: '700' },
  statLabel:   { fontSize: 11, color: '#64748b', marginTop: 4, fontWeight: '500' },
  section:     { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginHorizontal: 16, marginBottom: 12 },
  sectionTitle:{ fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  infoRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  infoLabel:   { fontSize: 13, color: '#64748b', fontWeight: '500' },
  infoValue:   { fontSize: 13, color: '#0f172a', fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  staffRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  staffAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  staffInitial:{ fontSize: 14, fontWeight: '700', color: '#16a34a' },
  staffInfo:   { flex: 1 },
  staffName:   { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  staffRole:   { fontSize: 12, color: '#64748b', marginTop: 1, textTransform: 'capitalize' },
  activeDot:   { width: 8, height: 8, borderRadius: 4 },
  servicesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceChip: { backgroundColor: '#dcfce7', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  serviceChipText: { fontSize: 12, color: '#166534', fontWeight: '600' },
  empty:       { textAlign: 'center', color: '#94a3b8', marginTop: 60 },
  modal:       { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 20 },
  modalTitle:  { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  modalClose:  { fontSize: 22, color: '#64748b', padding: 4 },
  mlabel:      { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 14, marginBottom: 6 },
  minput:      { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0f172a', backgroundColor: '#fff' },
  typeGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  typeChip:           { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  typeChipActive:     { borderColor: '#16a34a', backgroundColor: '#dcfce7' },
  typeChipText:       { fontSize: 13, color: '#64748b', fontWeight: '500' },
  typeChipTextActive: { color: '#16a34a', fontWeight: '700' },
  errorBanner: { backgroundColor: '#fee2e2', borderRadius: 8, padding: 12, marginBottom: 12 },
  errorText:   { fontSize: 13, color: '#dc2626' },
  btnRow:      { flexDirection: 'row', marginTop: 24 },
  primaryBtn:  { backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText:{ color: '#fff', fontWeight: '700', fontSize: 15 },
  outlineBtn:  { borderWidth: 1.5, borderColor: '#16a34a', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  outlineBtnText:{ color: '#16a34a', fontWeight: '700', fontSize: 15 },
});
