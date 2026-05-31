/**
 * screens/driver/TransportScreen.jsx
 * Original NeoMatCare transport UI — restored with new logic.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator, Alert, Modal, ScrollView,
} from 'react-native';
import { transportAPI, getErrorMessage } from '../../api/client';

const STATUS_COLORS = {
  requested:  { bg: '#fef3c7', text: '#d97706' },
  accepted:   { bg: '#dcfce7', text: '#16a34a' },
  dispatched: { bg: '#dbeafe', text: '#2563eb' },
  in_transit: { bg: '#dbeafe', text: '#2563eb' },
  arrived:    { bg: '#ede9fe', text: '#7c3aed' },
  delivered:  { bg: '#d1fae5', text: '#059669' },
  completed:  { bg: '#d1fae5', text: '#059669' },
  cancelled:  { bg: '#fee2e2', text: '#dc2626' },
  pending:    { bg: '#fef3c7', text: '#d97706' },
};

const NEXT_STATUS = {
  requested:  'accepted',
  accepted:   'dispatched',
  dispatched: 'arrived',
  arrived:    'completed',
  pending:    'accepted',
  in_transit: 'delivered',
};

const STATUS_TABS = ['all', 'pending', 'accepted', 'in_transit', 'delivered'];

export default function TransportScreen() {
  const [requests,   setRequests]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab,  setActiveTab]  = useState('all');
  const [selected,   setSelected]   = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const load = useCallback(async () => {
    try {
      const params = {};
      if (activeTab !== 'all') params.status = activeTab;
      const res = await transportAPI.getTransports(params);
      setRequests(Array.isArray(res.data) ? res.data : res.data?.results || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [activeTab]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id, newStatus) => {
    try {
      await transportAPI.updateTransportStatus(id, { status: newStatus });
      load();
      setShowDetail(false);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    }
  };

  const renderItem = ({ item }) => {
    const s    = STATUS_COLORS[item.status] || STATUS_COLORS.requested;
    const next = NEXT_STATUS[item.status];
    const caseId = typeof item.emergency_case === 'string' || typeof item.emergency_case === 'number'
      ? String(item.emergency_case).slice(0, 8).toUpperCase()
      : item.id;

    return (
      <TouchableOpacity style={styles.card} onPress={() => { setSelected(item); setShowDetail(true); }}>
        <View style={styles.cardTop}>
          <Text style={styles.caseId}>
            {item.patient_name || item.referral?.patient_name || `Case #${caseId}`}
          </Text>
          <View style={[styles.badge, { backgroundColor: s.bg }]}>
            <Text style={[styles.badgeText, { color: s.text }]}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        {/* Route */}
        <View style={styles.routeRow}>
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, { backgroundColor: '#16a34a' }]} />
            <Text style={styles.routeText} numberOfLines={1}>
              {item.pickup_location || item.from_facility || item.pickup_facility_name || 'Pickup'}
            </Text>
          </View>
          <Text style={styles.routeArrow}>→</Text>
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, { backgroundColor: '#dc2626' }]} />
            <Text style={styles.routeText} numberOfLines={1}>
              {item.dropoff_location || item.to_facility || item.destination_facility_name || 'Destination'}
            </Text>
          </View>
        </View>

        {item.pickup_notes ? <Text style={styles.meta}>Notes: {item.pickup_notes}</Text> : null}
        {item.estimated_minutes ? <Text style={styles.meta}>Est: {item.estimated_minutes} min</Text> : null}

        {next && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => Alert.alert(
              `Mark as ${next.toUpperCase()}?`, '',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Confirm', onPress: () => updateStatus(item.id, next) },
              ]
            )}
          >
            <Text style={styles.actionBtnText}>→ {next.toUpperCase()}</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) return <ActivityIndicator style={styles.loader} color="#16a34a" />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Transport</Text>

      {/* Status tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsWrap} contentContainerStyle={styles.tabs}>
        {STATUS_TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={requests}
        keyExtractor={r => String(r.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#16a34a" />}
        ListEmptyComponent={<Text style={styles.empty}>No transport assignments.</Text>}
      />

      {selected && (
        <TransportDetailModal
          visible={showDetail}
          transport={selected}
          onClose={() => setShowDetail(false)}
          onAction={updateStatus}
        />
      )}
    </View>
  );
}

// ── Transport Detail Modal ─────────────────────────────────────────────────────
function TransportDetailModal({ visible, transport, onClose, onAction }) {
  const [loading, setLoading] = useState(false);
  const s    = STATUS_COLORS[transport.status] || STATUS_COLORS.requested;
  const next = NEXT_STATUS[transport.status];

  const act = async (newStatus) => {
    setLoading(true);
    await onAction(transport.id, newStatus);
    setLoading(false);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Trip Details</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
        </View>

        <View style={[styles.statusBadgeLarge, { backgroundColor: s.bg }]}>
          <Text style={[styles.statusBadgeLargeText, { color: s.text }]}>{transport.status.toUpperCase()}</Text>
        </View>

        <View style={styles.detailSection}>
          <DRow label="Patient"   value={transport.patient_name || transport.referral?.patient_name} />
          <DRow label="Pickup"    value={transport.pickup_location || transport.from_facility || transport.pickup_facility_name} />
          <DRow label="Drop-off"  value={transport.dropoff_location || transport.to_facility || transport.destination_facility_name} />
          {transport.estimated_minutes && <DRow label="Est. Time"  value={`${transport.estimated_minutes} min`} />}
          {transport.distance_km && <DRow label="Distance" value={`${transport.distance_km} km`} />}
          {transport.notes && <DRow label="Notes" value={transport.notes} />}
          {transport.pickup_notes && <DRow label="Notes" value={transport.pickup_notes} />}
        </View>

        {next && !loading && (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => Alert.alert(
              `Mark as ${next.toUpperCase()}?`, '',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Confirm', onPress: () => act(next) },
              ]
            )}
          >
            <Text style={styles.primaryBtnText}>→ {next.toUpperCase()}</Text>
          </TouchableOpacity>
        )}
        {loading && <ActivityIndicator color="#16a34a" style={{ marginVertical: 16 }} />}

        <TouchableOpacity style={[styles.outlineBtn, { marginTop: 10 }]} onPress={onClose}>
          <Text style={styles.outlineBtnText}>Close</Text>
        </TouchableOpacity>
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
  tabsWrap:    { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tabs:        { paddingHorizontal: 16, paddingVertical: 8, gap: 8, flexDirection: 'row' },
  tab:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#f1f5f9' },
  tabActive:   { backgroundColor: '#16a34a' },
  tabText:     { fontSize: 12, fontWeight: '600', color: '#64748b' },
  tabTextActive:{ color: '#fff' },
  list:        { padding: 16, gap: 12 },
  loader:      { flex: 1, marginTop: 60 },
  card:        { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  caseId:      { fontSize: 14, fontWeight: '700', color: '#0f172a', flex: 1, marginRight: 8 },
  badge:       { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText:   { fontSize: 10, fontWeight: '700' },
  routeRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 },
  routePoint:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  routeDot:    { width: 8, height: 8, borderRadius: 4 },
  routeText:   { fontSize: 12, color: '#64748b', flex: 1 },
  routeArrow:  { fontSize: 14, color: '#94a3b8' },
  meta:        { fontSize: 12, color: '#64748b', marginBottom: 2 },
  actionBtn:   { marginTop: 12, backgroundColor: '#16a34a', borderRadius: 8, padding: 10, alignItems: 'center' },
  actionBtnText:{ color: '#fff', fontWeight: '700', fontSize: 13 },
  empty:       { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
  modal:       { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 16 },
  modalTitle:  { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  modalClose:  { fontSize: 22, color: '#64748b', padding: 4 },
  statusBadgeLarge:     { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 20 },
  statusBadgeLargeText: { fontWeight: '700', fontSize: 13 },
  detailSection:{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  drow:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  drowLabel:   { fontSize: 13, color: '#64748b', fontWeight: '500' },
  drowValue:   { fontSize: 13, color: '#0f172a', fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  primaryBtn:  { backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText:{ color: '#fff', fontWeight: '700', fontSize: 14 },
  outlineBtn:  { borderWidth: 1.5, borderColor: '#16a34a', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  outlineBtnText:{ color: '#16a34a', fontWeight: '700', fontSize: 14 },
});
