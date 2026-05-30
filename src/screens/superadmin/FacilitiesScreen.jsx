import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, StyleSheet, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { facilitiesAPI, getErrorMessage } from '../../api/client';
import {
  Card, Button, Spinner, EmptyState, ErrorBanner,
  Modal, Input, Select, Divider,
} from '../../components/ui';
import Colors from '../../constants/colors';
import { Typography, Spacing, Radius } from '../../constants/theme';

const FACILITY_TYPES = [
  { value: 'hospital',       label: 'Hospital' },
  { value: 'clinic',         label: 'Clinic' },
  { value: 'health_center',  label: 'Health Center' },
  { value: 'maternity_home', label: 'Maternity Home' },
];

const FacilitiesScreen = () => {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState('');
  const [error, setError]           = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected]     = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const fetchFacilities = useCallback(async () => {
    try {
      setError('');
      const params = {};
      if (search) params.search = search;
      const res = await facilitiesAPI.getFacilities(params);
      setFacilities(res.data?.results || res.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchFacilities, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [fetchFacilities]);

  const onRefresh = () => { setRefreshing(true); fetchFacilities(); };

  const handleDelete = async (id) => {
    try {
      await facilitiesAPI.deleteFacility(id);
      setShowDetail(false);
      fetchFacilities();
    } catch (err) { setError(getErrorMessage(err)); }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => { setSelected(item); setShowDetail(true); }} activeOpacity={0.8}>
      <Card style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.iconBox}>
            <Ionicons name="business" size={20} color={Colors.primary} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.cardType}>{item.facility_type?.replace(/_/g, ' ')}</Text>
          </View>
          <View style={[styles.activeDot, { backgroundColor: item.is_active ? Colors.success : Colors.gray300 }]} />
        </View>
        <View style={styles.cardMeta}>
          {item.region && (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.metaText}>{item.region}</Text>
            </View>
          )}
          {item.staff_count !== undefined && (
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.metaText}>{item.staff_count} staff</Text>
            </View>
          )}
          {item.capacity !== undefined && (
            <View style={styles.metaItem}>
              <Ionicons name="bed-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.metaText}>{item.capacity} beds</Text>
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Facilities</Text>
          <Text style={styles.headerSub}>{facilities.length} total</Text>
        </View>
        <Button title="Add Facility" icon="add-outline" size="sm" onPress={() => setShowCreate(true)} />
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={17} color={Colors.gray400} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search facilities..."
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
      </View>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {loading && !refreshing ? (
        <Spinner fullScreen />
      ) : (
        <FlatList
          data={facilities}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, facilities.length === 0 && { flex: 1 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="business-outline"
              title="No facilities found"
              message={search ? 'Try a different search.' : 'Add your first facility to get started.'}
              action={!search ? { label: 'Add Facility', onPress: () => setShowCreate(true) } : undefined}
            />
          }
        />
      )}

      <FacilityFormModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onSaved={() => { setShowCreate(false); fetchFacilities(); }}
      />

      {selected && (
        <FacilityDetailModal
          visible={showDetail}
          facility={selected}
          onClose={() => setShowDetail(false)}
          onDelete={handleDelete}
          onUpdated={() => { setShowDetail(false); fetchFacilities(); }}
        />
      )}
    </SafeAreaView>
  );
};

// ─── Create/Edit Form Modal ───────────────────────────────────────────────────
const FacilityFormModal = ({ visible, onClose, onSaved, existing }) => {
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
  const [apiError, setApiError] = useState('');
  const set = (f) => (v) => setForm((p) => ({ ...p, [f]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    setApiError('');
    try {
      const payload = { ...form, capacity: form.capacity ? Number(form.capacity) : undefined };
      if (existing) await facilitiesAPI.updateFacility(existing.id, payload);
      else          await facilitiesAPI.createFacility(payload);
      onSaved();
    } catch (err) {
      setApiError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title={existing ? 'Edit Facility' : 'Add Facility'} size="lg">
      <ErrorBanner message={apiError} onDismiss={() => setApiError('')} />
      <Input label="Facility Name" value={form.name} onChangeText={set('name')} required />
      <Select label="Type" value={form.facility_type} onValueChange={set('facility_type')} options={FACILITY_TYPES} />
      <Input label="Address"  value={form.address}  onChangeText={set('address')} />
      <Input label="Region"   value={form.region}   onChangeText={set('region')} />
      <Input label="Phone"    value={form.phone}    onChangeText={set('phone')}  keyboardType="phone-pad" />
      <Input label="Email"    value={form.email}    onChangeText={set('email')}  keyboardType="email-address" autoCapitalize="none" />
      <Input label="Capacity" value={form.capacity} onChangeText={set('capacity')} keyboardType="numeric" />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Cancel" variant="outline" onPress={onClose} style={{ flex: 1 }} />
        <Button title={existing ? 'Save' : 'Create'} onPress={handleSave} loading={loading} style={{ flex: 1 }} />
      </View>
    </Modal>
  );
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const FacilityDetailModal = ({ visible, facility, onClose, onDelete, onUpdated }) => {
  const [showEdit, setShowEdit]       = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [delLoading, setDelLoading]   = useState(false);

  const doDelete = async () => {
    setDelLoading(true);
    await onDelete(facility.id);
    setDelLoading(false);
  };

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
    <Modal visible={visible} onClose={onClose} title={facility.name} size="lg">
      <DetailRow label="Type"     value={facility.facility_type?.replace(/_/g, ' ')} />
      <DetailRow label="Region"   value={facility.region} />
      <DetailRow label="Address"  value={facility.address} />
      <DetailRow label="Phone"    value={facility.phone} />
      <DetailRow label="Email"    value={facility.email} />
      <DetailRow label="Capacity" value={facility.capacity ? `${facility.capacity} beds` : undefined} />
      <DetailRow label="Staff"    value={facility.staff_count !== undefined ? `${facility.staff_count} members` : undefined} />

      <Divider />

      {confirmDelete ? (
        <View style={styles.confirmBox}>
          <Text style={styles.confirmText}>Delete this facility? This cannot be undone.</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Cancel" variant="outline" size="sm" onPress={() => setConfirmDelete(false)} style={{ flex: 1 }} />
            <Button title="Delete" variant="danger" size="sm" loading={delLoading} onPress={doDelete} style={{ flex: 1 }} />
          </View>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <Button title="Edit Facility" icon="create-outline" variant="outline" onPress={() => setShowEdit(true)} fullWidth />
          <Button title="Delete Facility" icon="trash-outline" variant="danger" onPress={() => setConfirmDelete(true)} fullWidth />
          <Button title="Close" variant="ghost" onPress={onClose} fullWidth />
        </View>
      )}
    </Modal>
  );
};

const DetailRow = ({ label, value }) => {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.background },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  headerSub:   { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 1 },

  searchWrap:  { backgroundColor: Colors.white, paddingHorizontal: Spacing[4], paddingVertical: Spacing[2] },
  searchBox:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing[3], height: 44 },
  searchInput: { flex: 1, fontSize: Typography.base, color: Colors.textPrimary },

  list: { padding: Spacing[4], paddingBottom: Spacing[10] },

  card:    { marginBottom: Spacing[3] },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing[2] },
  iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: Spacing[3] },
  cardInfo:{ flex: 1 },
  cardName:{ fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  cardType:{ fontSize: Typography.xs, color: Colors.textSecondary, textTransform: 'capitalize', marginTop: 2 },
  activeDot:{ width: 8, height: 8, borderRadius: 4 },
  cardMeta:{ flexDirection: 'row', gap: Spacing[4] },
  metaItem:{ flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:{ fontSize: Typography.xs, color: Colors.textMuted },

  detailRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing[2], borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  detailLabel: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
  detailValue: { fontSize: Typography.sm, color: Colors.textPrimary, flex: 1, textAlign: 'right' },

  confirmBox:  { backgroundColor: Colors.dangerLight + '60', padding: Spacing[3], borderRadius: Radius.md, marginBottom: Spacing[3], gap: 10 },
  confirmText: { fontSize: Typography.sm, color: Colors.dangerDark },
});

export default FacilitiesScreen;
