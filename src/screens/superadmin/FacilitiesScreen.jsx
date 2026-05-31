/**
 * screens/superadmin/FacilitiesScreen.jsx
 * Original NeoMatCare facilities UI — restored with new CRUD logic.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, RefreshControl, ActivityIndicator, Alert, Modal, ScrollView,
} from 'react-native';
import { facilitiesAPI, getErrorMessage } from '../../api/client';

const FACILITY_TYPES = [
  { value: 'hospital',       label: 'Hospital' },
  { value: 'clinic',         label: 'Clinic' },
  { value: 'health_center',  label: 'Health Center' },
  { value: 'maternity_home', label: 'Maternity Home' },
];

export default function FacilitiesScreen() {
  const [facilities, setFacilities] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selected,   setSelected]   = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const load = useCallback(async () => {
    try {
      const params = {};
      if (search) params.search = search;
      const res = await facilitiesAPI.getFacilities(params);
      setFacilities(Array.isArray(res.data) ? res.data : res.data?.results || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [load]);

  const handleDelete = async (id) => {
    try { await facilitiesAPI.deleteFacility(id); setShowDetail(false); load(); }
    catch (err) { Alert.alert('Error', getErrorMessage(err)); }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => { setSelected(item); setShowDetail(true); }}
    >
      <View style={styles.cardTop}>
        <View style={styles.iconBox}>
          <Text style={styles.iconEmoji}>🏥</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardType}>{item.facility_type?.replace(/_/g, ' ')}</Text>
        </View>
        <View style={[styles.activeDot, { backgroundColor: item.is_active !== false ? '#16a34a' : '#d1d5db' }]} />
      </View>
      <View style={styles.cardMeta}>
        {item.region && <Text style={styles.metaText}>📍 {item.region}</Text>}
        {item.staff_count != null && <Text style={styles.metaText}>👥 {item.staff_count} staff</Text>}
        {item.capacity    != null && <Text style={styles.metaText}>🛏 {item.capacity} beds</Text>}
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) return <ActivityIndicator style={styles.loader} color="#16a34a" />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Facilities</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search facilities..."
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

      <FlatList
        data={facilities}
        keyExtractor={f => String(f.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#16a34a" />}
        ListEmptyComponent={<Text style={styles.empty}>No facilities found.</Text>}
      />

      <FacilityFormModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onSaved={() => { setShowCreate(false); load(); }}
      />

      {selected && (
        <FacilityDetailModal
          visible={showDetail}
          facility={selected}
          onClose={() => setShowDetail(false)}
          onDelete={handleDelete}
          onUpdated={() => { setShowDetail(false); load(); }}
        />
      )}
    </View>
  );
}

// ── Facility Form Modal ────────────────────────────────────────────────────────
function FacilityFormModal({ visible, onClose, onSaved, existing }) {
  const [form, setForm] = useState({
    name:          existing?.name          || '',
    facility_type: existing?.facility_type || '',
    address:       existing?.address       || '',
    region:        existing?.region        || '',
    phone:         existing?.phone         || '',
    email:         existing?.email         || '',
    capacity:      existing?.capacity ? String(existing.capacity) : '',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const set = (f) => (v) => setForm(p => ({ ...p, [f]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Required', 'Facility name is required.'); return; }
    setLoading(true); setError('');
    try {
      const payload = { ...form, capacity: form.capacity ? Number(form.capacity) : undefined };
      if (existing) await facilitiesAPI.updateFacility(existing.id, payload);
      else          await facilitiesAPI.createFacility(payload);
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView style={styles.modal} keyboardShouldPersistTaps="handled">
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{existing ? 'Edit Facility' : 'Add Facility'}</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
        </View>
        {error ? <View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View> : null}

        <MField label="Facility Name *" value={form.name}    onChange={set('name')}    placeholder="e.g. Korle Bu Teaching Hospital" />

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
        <MField label="Phone"        value={form.phone}    onChange={set('phone')}    placeholder="+233 XX XXX XXXX"  keyboard="phone-pad" />
        <MField label="Email"        value={form.email}    onChange={set('email')}    placeholder="facility@health.gh" keyboard="email-address" />
        <MField label="Bed Capacity" value={form.capacity} onChange={set('capacity')} placeholder="e.g. 120"          keyboard="numeric" />

        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.outlineBtn, { flex: 1 }]} onPress={onClose}>
            <Text style={styles.outlineBtnText}>Cancel</Text>
          </TouchableOpacity>
          <View style={{ width: 12 }} />
          <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }, loading && { opacity: 0.6 }]} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryBtnText}>{existing ? 'Save' : 'Create'}</Text>}
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </Modal>
  );
}

// ── Facility Detail Modal ──────────────────────────────────────────────────────
function FacilityDetailModal({ visible, facility, onClose, onDelete, onUpdated }) {
  const [showEdit,      setShowEdit]      = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [delLoading,    setDelLoading]    = useState(false);

  if (showEdit) {
    return (
      <FacilityFormModal
        visible={visible}
        existing={facility}
        onClose={() => setShowEdit(false)}
        onSaved={() => { setShowEdit(false); onUpdated(); }}
      />
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle} numberOfLines={1}>{facility.name}</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
        </View>

        <View style={styles.detailSection}>
          <DRow label="Type"     value={facility.facility_type?.replace(/_/g, ' ')} />
          <DRow label="Region"   value={facility.region} />
          <DRow label="Address"  value={facility.address} />
          <DRow label="Phone"    value={facility.phone} />
          <DRow label="Email"    value={facility.email} />
          <DRow label="Capacity" value={facility.capacity ? `${facility.capacity} beds` : null} />
          <DRow label="Staff"    value={facility.staff_count != null ? `${facility.staff_count} members` : null} />
          <DRow label="Status"   value={facility.is_active !== false ? 'Active' : 'Inactive'}
                                 valueColor={facility.is_active !== false ? '#16a34a' : '#dc2626'} />
        </View>

        {/* Services */}
        {facility.services?.length > 0 && (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Services</Text>
            <View style={styles.servicesRow}>
              {facility.services.map((s, i) => (
                <View key={i} style={styles.serviceChip}>
                  <Text style={styles.serviceChipText}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {confirmDelete ? (
          <View style={styles.confirmBox}>
            <Text style={styles.confirmText}>Delete {facility.name}? This cannot be undone.</Text>
            <View style={styles.btnRow}>
              <TouchableOpacity style={[styles.outlineBtn, { flex: 1 }]} onPress={() => setConfirmDelete(false)}>
                <Text style={styles.outlineBtnText}>Cancel</Text>
              </TouchableOpacity>
              <View style={{ width: 12 }} />
              <TouchableOpacity
                style={[styles.dangerBtn, { flex: 1 }, delLoading && { opacity: 0.6 }]}
                onPress={async () => { setDelLoading(true); await onDelete(facility.id); setDelLoading(false); }}
                disabled={delLoading}
              >
                {delLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryBtnText}>Delete</Text>}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.detailActions}>
            <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowEdit(true)}>
              <Text style={styles.outlineBtnText}>Edit Facility</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.dangerBtn, { marginTop: 10 }]} onPress={() => setConfirmDelete(true)}>
              <Text style={styles.primaryBtnText}>Delete Facility</Text>
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
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 56, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  title:       { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  addBtn:      { backgroundColor: '#16a34a', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText:  { color: '#fff', fontWeight: '700', fontSize: 13 },
  searchWrap:  { flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 8, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14 },
  searchInput: { flex: 1, fontSize: 15, color: '#0f172a', paddingVertical: 12 },
  clearBtn:    { padding: 4 },
  clearBtnText:{ fontSize: 14, color: '#94a3b8' },
  list:        { padding: 16, paddingTop: 8, gap: 12 },
  loader:      { flex: 1, marginTop: 60 },
  card:        { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardTop:     { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  iconBox:     { width: 44, height: 44, borderRadius: 12, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  iconEmoji:   { fontSize: 20 },
  cardInfo:    { flex: 1 },
  cardName:    { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  cardType:    { fontSize: 12, color: '#64748b', marginTop: 2, textTransform: 'capitalize' },
  activeDot:   { width: 8, height: 8, borderRadius: 4 },
  cardMeta:    { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  metaText:    { fontSize: 12, color: '#64748b' },
  empty:       { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
  modal:       { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 20 },
  modalTitle:  { fontSize: 20, fontWeight: '700', color: '#0f172a', flex: 1, marginRight: 8 },
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
  primaryBtnText:{ color: '#fff', fontWeight: '700', fontSize: 14 },
  outlineBtn:  { borderWidth: 1.5, borderColor: '#16a34a', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  outlineBtnText:{ color: '#16a34a', fontWeight: '700', fontSize: 14 },
  dangerBtn:   { backgroundColor: '#dc2626', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  detailSection:      { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  detailSectionTitle: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  drow:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  drowLabel:   { fontSize: 13, color: '#64748b', fontWeight: '500' },
  drowValue:   { fontSize: 13, color: '#0f172a', fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  servicesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceChip: { backgroundColor: '#dcfce7', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  serviceChipText: { fontSize: 12, color: '#166534', fontWeight: '600' },
  detailActions:{ marginBottom: 16 },
  confirmBox:  { backgroundColor: '#fee2e2', borderRadius: 10, padding: 16, marginBottom: 16 },
  confirmText: { fontSize: 13, color: '#dc2626', marginBottom: 12 },
});
