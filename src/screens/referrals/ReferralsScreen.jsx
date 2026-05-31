/**
 * screens/referrals/ReferralsScreen.jsx
 * Original NeoMatCare referrals UI — restored with new search/tab/action logic.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, RefreshControl, ActivityIndicator, Alert, Modal, ScrollView,
} from 'react-native';
import { referralsAPI, getErrorMessage } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

const STATUS_COLORS = {
  DRAFT:      { bg: '#f1f5f9', text: '#64748b' },
  PENDING:    { bg: '#fef3c7', text: '#d97706' },
  ACCEPTED:   { bg: '#dcfce7', text: '#16a34a' },
  IN_TRANSIT: { bg: '#dbeafe', text: '#2563eb' },
  RECEIVED:   { bg: '#ede9fe', text: '#7c3aed' },
  COMPLETED:  { bg: '#d1fae5', text: '#059669' },
  CANCELLED:  { bg: '#fee2e2', text: '#dc2626' },
  FAILED:     { bg: '#fee2e2', text: '#dc2626' },
  // lowercase from revamp API
  pending:    { bg: '#fef3c7', text: '#d97706' },
  accepted:   { bg: '#dcfce7', text: '#16a34a' },
  completed:  { bg: '#d1fae5', text: '#059669' },
  rejected:   { bg: '#fee2e2', text: '#dc2626' },
};

const STATUS_TABS = ['all', 'pending', 'accepted', 'completed', 'cancelled'];

const VALID_TRANSITIONS = {
  DRAFT:      ['PENDING', 'CANCELLED'],
  PENDING:    ['ACCEPTED', 'CANCELLED'],
  ACCEPTED:   ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['RECEIVED', 'FAILED'],
  RECEIVED:   ['COMPLETED'],
};

export default function ReferralsScreen() {
  const { userRole } = useAuth();
  const isFacilityAdmin = userRole === 'facility_admin';

  const [referrals,  setReferrals]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab,  setActiveTab]  = useState('all');
  const [search,     setSearch]     = useState('');
  const [selected,   setSelected]   = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const load = useCallback(async () => {
    try {
      const params = {};
      if (activeTab !== 'all') params.status = activeTab;
      if (search) params.search = search;
      const res = await referralsAPI.getReferrals(params);
      setReferrals(Array.isArray(res.data) ? res.data : res.data?.results || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [activeTab, search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [load]);

  const renderItem = ({ item }) => {
    const s = STATUS_COLORS[item.status] || STATUS_COLORS.DRAFT;
    const patientName = item.emergency_case?.patient?.patient_name || item.patient_name || 'Patient';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => { setSelected(item); setShowDetail(true); }}
      >
        <View style={styles.cardTop}>
          <Text style={styles.patientName}>{patientName}</Text>
          <View style={[styles.badge, { backgroundColor: s.bg }]}>
            <Text style={[styles.badgeText, { color: s.text }]}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.meta}>
          {isFacilityAdmin
            ? `From: ${item.referring_facility_name || item.from_facility_name || '—'}`
            : `To: ${item.receiving_facility_name   || item.to_facility_name   || '—'}`}
        </Text>
        {(item.emergency_case?.danger_signs?.length > 0) && (
          <Text style={styles.meta} numberOfLines={1}>
            ⚠ {item.emergency_case.danger_signs.slice(0, 2).map(s => s.replace(/_/g, ' ')).join(', ')}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) return <ActivityIndicator style={styles.loader} color="#16a34a" />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isFacilityAdmin ? 'Incoming Referrals' : 'Referrals'}</Text>

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search referrals..."
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

      {/* Status tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsWrap} contentContainerStyle={styles.tabs}>
        {STATUS_TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={referrals}
        keyExtractor={r => String(r.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#16a34a" />}
        ListEmptyComponent={<Text style={styles.empty}>No referrals found.</Text>}
      />

      {selected && (
        <ReferralDetailModal
          visible={showDetail}
          referral={selected}
          onClose={() => setShowDetail(false)}
          onUpdated={() => { setShowDetail(false); load(); }}
        />
      )}
    </View>
  );
}

// ── Referral Detail Modal ──────────────────────────────────────────────────────
function ReferralDetailModal({ visible, referral, onClose, onUpdated }) {
  const [updating, setUpdating] = useState(false);

  const nextStatuses = VALID_TRANSITIONS[referral.status] || [];

  const handleStatusUpdate = (newStatus) => {
    Alert.alert(
      `Mark as ${newStatus}?`,
      `Update this referral to ${newStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setUpdating(true);
            try {
              await referralsAPI.updateStatus(referral.id, newStatus);
              onUpdated();
            } catch (err) {
              Alert.alert('Error', getErrorMessage(err));
            }
            setUpdating(false);
          },
        },
      ]
    );
  };

  const s = STATUS_COLORS[referral.status] || STATUS_COLORS.DRAFT;
  const patient = referral.emergency_case?.patient || {};
  const danger  = referral.emergency_case?.danger_signs || [];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Referral</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
        </View>

        <Text style={styles.refId}>{String(referral.id).slice(0, 8).toUpperCase()}</Text>
        <View style={[styles.statusBadgeLarge, { backgroundColor: s.bg }]}>
          <Text style={[styles.statusBadgeLargeText, { color: s.text }]}>{referral.status}</Text>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Patient</Text>
          <DRow label="Name"  value={patient.patient_name || '—'} />
          <DRow label="Age"   value={patient.age ? `${patient.age} years` : null} />
          <DRow label="Phone" value={patient.patient_phone_number} />
        </View>

        {danger.length > 0 && (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Danger Signs</Text>
            {danger.map(s => <Text key={s} style={styles.dangerSign}>⚠ {s.replace(/_/g, ' ')}</Text>)}
          </View>
        )}

        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Route</Text>
          <DRow label="From" value={referral.referring_facility_name || referral.from_facility_name} />
          <DRow label="To"   value={referral.receiving_facility_name || referral.to_facility_name} />
        </View>

        {nextStatuses.length > 0 && !updating && (
          <View style={styles.actionBtns}>
            {nextStatuses.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.actionBtn, (s === 'CANCELLED' || s === 'FAILED') ? styles.dangerBtn : styles.primaryBtn]}
                onPress={() => handleStatusUpdate(s)}
              >
                <Text style={styles.actionBtnText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {updating && <ActivityIndicator color="#16a34a" style={{ marginVertical: 16 }} />}
        <View style={{ height: 40 }} />
      </ScrollView>
    </Modal>
  );
}

function DRow({ label, value }) {
  if (!value) return null;
  return (
    <View style={styles.drow}>
      <Text style={styles.drowLabel}>{label}</Text>
      <Text style={styles.drowValue}>{String(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f8fafc' },
  title:       { fontSize: 20, fontWeight: '700', color: '#0f172a', padding: 20, paddingTop: 56, paddingBottom: 8 },
  searchWrap:  { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14 },
  searchInput: { flex: 1, fontSize: 15, color: '#0f172a', paddingVertical: 12 },
  clearBtn:    { padding: 4 },
  clearBtnText:{ fontSize: 14, color: '#94a3b8' },
  tabsWrap:    { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tabs:        { paddingHorizontal: 16, paddingVertical: 8, gap: 8, flexDirection: 'row' },
  tab:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#f1f5f9' },
  tabActive:   { backgroundColor: '#16a34a' },
  tabText:     { fontSize: 12, fontWeight: '600', color: '#64748b' },
  tabTextActive:{ color: '#fff' },
  list:        { padding: 16, gap: 12 },
  loader:      { flex: 1, marginTop: 60 },
  card:        { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  patientName: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  badge:       { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText:   { fontSize: 11, fontWeight: '700' },
  meta:        { fontSize: 12, color: '#64748b', marginTop: 2 },
  empty:       { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
  modal:       { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 16 },
  modalTitle:  { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  modalClose:  { fontSize: 22, color: '#64748b', padding: 4 },
  refId:       { fontSize: 13, color: '#94a3b8', marginBottom: 8 },
  statusBadgeLarge:     { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 20 },
  statusBadgeLargeText: { fontWeight: '700', fontSize: 13 },
  detailSection:      { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  detailSectionTitle: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  drow:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  drowLabel:   { fontSize: 13, color: '#64748b', fontWeight: '500' },
  drowValue:   { fontSize: 13, color: '#0f172a', fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  dangerSign:  { fontSize: 14, color: '#dc2626', marginBottom: 4 },
  actionBtns:  { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 32 },
  actionBtn:   { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center' },
  primaryBtn:  { backgroundColor: '#16a34a' },
  dangerBtn:   { backgroundColor: '#dc2626' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
