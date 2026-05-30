import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { facilitiesAPI, getErrorMessage } from '../../api/client';
import {
  Card, Button, Spinner, EmptyState, ErrorBanner,
  Modal, Input, Select, Divider, SectionHeader, StatCard,
} from '../../components/ui';
import Colors from '../../constants/colors';
import { Typography, Spacing } from '../../constants/theme';

const FACILITY_TYPES = [
  { value: 'hospital',        label: 'Hospital' },
  { value: 'clinic',          label: 'Clinic' },
  { value: 'health_center',   label: 'Health Center' },
  { value: 'maternity_home',  label: 'Maternity Home' },
];

const FacilityScreen = () => {
  const [facility, setFacility]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  const fetchFacility = useCallback(async () => {
    try {
      setError('');
      const res = await facilitiesAPI.getMyFacility();
      setFacility(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchFacility(); }, [fetchFacility]);

  const onRefresh = () => { setRefreshing(true); fetchFacility(); };

  if (loading) return <Spinner fullScreen />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Facility</Text>
          {facility?.name && <Text style={styles.headerSub}>{facility.name}</Text>}
        </View>
        {facility && (
          <Button title="Edit" icon="create-outline" size="sm" variant="outline" onPress={() => setShowEditModal(true)} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <ErrorBanner message={error} onDismiss={() => setError('')} />

        {!facility ? (
          <EmptyState icon="business-outline" title="No facility found" message="Your facility information will appear here." />
        ) : (
          <>
            {/* Stats */}
            <View style={styles.statsRow}>
              <StatCard label="Total Staff"    value={facility.staff_count}   icon="people-outline"   color={Colors.primary}   style={{ flex: 1 }} />
              <View style={{ width: Spacing[3] }} />
              <StatCard label="Active Cases"   value={facility.active_cases}  icon="medical-outline"  color={Colors.secondary} style={{ flex: 1 }} />
              <View style={{ width: Spacing[3] }} />
              <StatCard label="Bed Capacity"   value={facility.capacity}      icon="bed-outline"      color={Colors.warning}   style={{ flex: 1 }} />
            </View>

            {/* Details */}
            <Card style={styles.section}>
              <SectionHeader title="Facility Information" />
              <InfoRow icon="business-outline"   label="Name"         value={facility.name} />
              <InfoRow icon="layers-outline"     label="Type"         value={facility.facility_type?.replace(/_/g, ' ')} />
              <InfoRow icon="location-outline"   label="Address"      value={facility.address} />
              <InfoRow icon="map-outline"        label="Region"       value={facility.region} />
              <InfoRow icon="call-outline"       label="Phone"        value={facility.phone} />
              <InfoRow icon="mail-outline"       label="Email"        value={facility.email} />
              <InfoRow icon="globe-outline"      label="Website"      value={facility.website} />
            </Card>

            {/* Staff list */}
            {facility.staff?.length > 0 && (
              <Card style={styles.section}>
                <SectionHeader title={`Staff (${facility.staff.length})`} />
                {facility.staff.map((member, i) => (
                  <View key={member.id || i}>
                    <View style={styles.staffRow}>
                      <View style={styles.staffAvatar}>
                        <Text style={styles.staffInitial}>
                          {(member.first_name?.[0] || member.email?.[0] || '?').toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.staffInfo}>
                        <Text style={styles.staffName}>
                          {[member.first_name, member.last_name].filter(Boolean).join(' ') || member.email}
                        </Text>
                        <Text style={styles.staffRole}>{member.role?.replace(/_/g, ' ')}</Text>
                      </View>
                      <View style={[styles.activeDot, { backgroundColor: member.is_active ? Colors.success : Colors.gray300 }]} />
                    </View>
                    {i < facility.staff.length - 1 && <Divider />}
                  </View>
                ))}
              </Card>
            )}

            {/* Services */}
            {facility.services?.length > 0 && (
              <Card style={styles.section}>
                <SectionHeader title="Services Offered" />
                <View style={styles.servicesTags}>
                  {facility.services.map((s, i) => (
                    <View key={i} style={styles.serviceTag}>
                      <Text style={styles.serviceTagText}>{s}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            )}
          </>
        )}
      </ScrollView>

      {facility && (
        <EditFacilityModal
          visible={showEditModal}
          facility={facility}
          onClose={() => setShowEditModal(false)}
          onSaved={() => { setShowEditModal(false); fetchFacility(); }}
        />
      )}
    </SafeAreaView>
  );
};

// ─── Edit Modal ───────────────────────────────────────────────────────────────
const EditFacilityModal = ({ visible, facility, onClose, onSaved }) => {
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
  const [apiError, setApiError] = useState('');
  const set = (f) => (v) => setForm((p) => ({ ...p, [f]: v }));

  const handleSave = async () => {
    setLoading(true);
    setApiError('');
    try {
      await facilitiesAPI.updateMyFacility({ ...form, capacity: form.capacity ? Number(form.capacity) : undefined });
      onSaved();
    } catch (err) {
      setApiError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Edit Facility" size="lg">
      <ScrollView showsVerticalScrollIndicator={false}>
        <ErrorBanner message={apiError} onDismiss={() => setApiError('')} />
        <Input label="Facility Name" value={form.name} onChangeText={set('name')} required />
        <Select label="Facility Type" value={form.facility_type} onValueChange={set('facility_type')} options={FACILITY_TYPES} />
        <Input label="Address"   value={form.address} onChangeText={set('address')} />
        <Input label="Region"    value={form.region}  onChangeText={set('region')} />
        <Input label="Phone"     value={form.phone}   onChangeText={set('phone')}  keyboardType="phone-pad" />
        <Input label="Email"     value={form.email}   onChangeText={set('email')}  keyboardType="email-address" autoCapitalize="none" />
        <Input label="Website"   value={form.website} onChangeText={set('website')} autoCapitalize="none" />
        <Input label="Bed Capacity" value={form.capacity} onChangeText={set('capacity')} keyboardType="numeric" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title="Cancel" variant="outline" onPress={onClose} style={{ flex: 1 }} />
          <Button title="Save Changes" onPress={handleSave} loading={loading} style={{ flex: 1 }} />
        </View>
      </ScrollView>
    </Modal>
  );
};

const InfoRow = ({ icon, label, value }) => {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={15} color={Colors.textMuted} style={{ marginRight: 8, width: 20 }} />
      <Text style={styles.infoLabel}>{label}: </Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  headerSub:   { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 1 },

  scroll:   { padding: Spacing[4], paddingBottom: Spacing[10] },
  statsRow: { flexDirection: 'row', marginBottom: Spacing[4] },
  section:  { marginBottom: Spacing[3] },

  infoRow:   { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 5 },
  infoLabel: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
  infoValue: { fontSize: Typography.sm, color: Colors.textPrimary, flex: 1 },

  staffRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing[2] },
  staffAvatar:  { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: Spacing[3] },
  staffInitial: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.primary },
  staffInfo:    { flex: 1 },
  staffName:    { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textPrimary },
  staffRole:    { fontSize: Typography.xs, color: Colors.textSecondary, textTransform: 'capitalize', marginTop: 2 },
  activeDot:    { width: 8, height: 8, borderRadius: 4 },

  servicesTags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  serviceTag:   { backgroundColor: Colors.primaryLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  serviceTagText: { fontSize: Typography.xs, color: Colors.primaryDark, fontWeight: Typography.medium },
});

export default FacilityScreen;
