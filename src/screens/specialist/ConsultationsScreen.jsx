/**
 * screens/specialist/ConsultationsScreen.jsx
 * Original NeoMatCare consultations UI — restored with new logic.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, RefreshControl, ActivityIndicator, Alert, Modal, ScrollView,
} from 'react-native';
import { consultationsAPI, getErrorMessage } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

const STATUS_COLORS = {
  requested:   { bg: '#fef3c7', text: '#d97706' },
  accepted:    { bg: '#dcfce7', text: '#16a34a' },
  in_progress: { bg: '#dbeafe', text: '#2563eb' },
  completed:   { bg: '#d1fae5', text: '#059669' },
  declined:    { bg: '#fee2e2', text: '#dc2626' },
  missed:      { bg: '#f1f5f9', text: '#64748b' },
  pending:     { bg: '#fef3c7', text: '#d97706' },
};

const CHANNEL_ICONS = { video: '📹', audio: '📞', text: '💬' };
const STATUS_TABS = ['all', 'pending', 'in_progress', 'completed'];

export default function ConsultationsScreen() {
  const { userRole } = useAuth();
  const isSpecialist = userRole === 'specialist';

  const [items,      setItems]      = useState([]);
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
      const res = await consultationsAPI.getConsultations(params);
      setItems(Array.isArray(res.data) ? res.data : res.data?.results || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [activeTab, search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [load]);

  const renderItem = ({ item }) => {
    const s = STATUS_COLORS[item.status] || STATUS_COLORS.missed;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => { setSelected(item); setShowDetail(true); }}
      >
        <View style={styles.cardTop}>
          <Text style={styles.channelIcon}>{CHANNEL_ICONS[item.channel] || '💬'}</Text>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>
              {item.specialist_name ? `Dr. ${item.specialist_name}` : 'Awaiting specialist'}
            </Text>
            <Text style={styles.cardSub}>
              Patient age {item.emergency_case?.patient?.age || '—'} · {item.specialty || '—'}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
            <Text style={[styles.statusPillText, { color: s.text }]}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        {item.emergency_case?.danger_signs?.length > 0 && (
          <Text style={styles.dangerText} numberOfLines={1}>
            ⚠ {item.emergency_case.danger_signs.slice(0, 2).map(d => d.replace(/_/g, ' ')).join(', ')}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) return <ActivityIndicator style={styles.loader} color="#16a34a" />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isSpecialist ? 'My Queue' : 'Consultations'}</Text>

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search consultations..."
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

      {/* Tabs */}
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
        data={items}
        keyExtractor={c => String(c.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#16a34a" />}
        ListEmptyComponent={<Text style={styles.empty}>No consultations found.</Text>}
      />

      {selected && (
        <ConsultationDetailModal
          visible={showDetail}
          consultation={selected}
          isSpecialist={isSpecialist}
          onClose={() => setShowDetail(false)}
          onUpdated={() => { setShowDetail(false); load(); }}
        />
      )}
    </View>
  );
}

// ── Consultation Detail Modal ──────────────────────────────────────────────────
function ConsultationDetailModal({ visible, consultation, isSpecialist, onClose, onUpdated }) {
  const [updating,    setUpdating]    = useState(false);
  const [note,        setNote]        = useState('');
  const [showNote,    setShowNote]    = useState(false);
  const [sendingNote, setSendingNote] = useState(false);
  const [apiError,    setApiError]    = useState('');

  const s     = STATUS_COLORS[consultation.status] || STATUS_COLORS.missed;
  const case_ = consultation.emergency_case;

  const handleStatusUpdate = (newStatus) => {
    Alert.alert(
      `${newStatus === 'accepted' ? 'Accept' : 'Decline'} Consultation?`, '',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setUpdating(true);
            try {
              await consultationsAPI.updateConsultation(consultation.id, { status: newStatus });
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

  const addNote = async () => {
    if (!note.trim()) return;
    setSendingNote(true);
    try {
      await consultationsAPI.addNote(consultation.id, { content: note });
      setNote(''); setShowNote(false); onUpdated();
    } catch (err) {
      setApiError(getErrorMessage(err));
    } finally { setSendingNote(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Consultation</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
        </View>

        <Text style={styles.subId}>{String(consultation.id).slice(0, 8).toUpperCase()}</Text>
        <View style={[styles.statusBadgeLarge, { backgroundColor: s.bg }]}>
          <Text style={[styles.statusBadgeLargeText, { color: s.text }]}>{consultation.status.toUpperCase()}</Text>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Patient</Text>
          <DRow label="Age"     value={case_?.patient?.age ? `${case_?.patient?.age} years` : null} />
          <DRow label="Signs"   value={case_?.danger_signs?.join(', ') || null} />
          <DRow label="Channel" value={consultation.channel} />
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Specialist</Text>
          <DRow label="Name"      value={consultation.specialist_name ? `Dr. ${consultation.specialist_name}` : 'Not assigned'} />
          <DRow label="Specialty" value={consultation.specialty} />
        </View>

        {consultation.recommendation ? (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Recommendation</Text>
            <Text style={styles.notes}>{consultation.recommendation}</Text>
          </View>
        ) : null}

        {apiError ? <View style={styles.errorBanner}><Text style={styles.errorText}>{apiError}</Text></View> : null}

        {/* Add note inline */}
        {showNote && (
          <View style={styles.detailSection}>
            <Text style={styles.mlabel}>Add Note</Text>
            <TextInput
              style={[styles.minput, { height: 80, textAlignVertical: 'top' }]}
              value={note}
              onChangeText={setNote}
              placeholder="Enter your note..."
              placeholderTextColor="#94a3b8"
              multiline
            />
            <View style={styles.btnRow}>
              <TouchableOpacity style={[styles.outlineBtn, { flex: 1 }]} onPress={() => setShowNote(false)}>
                <Text style={styles.outlineBtnText}>Cancel</Text>
              </TouchableOpacity>
              <View style={{ width: 12 }} />
              <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }, sendingNote && { opacity: 0.6 }]} onPress={addNote} disabled={sendingNote}>
                {sendingNote ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryBtnText}>Save Note</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Actions */}
        {!showNote && (
          <View style={styles.actionArea}>
            {consultation.status === 'in_progress' && (
              <TouchableOpacity style={[styles.outlineBtn, { marginBottom: 10 }]} onPress={() => setShowNote(true)}>
                <Text style={styles.outlineBtnText}>Add Note</Text>
              </TouchableOpacity>
            )}
            {consultation.status === 'pending' && (
              <TouchableOpacity style={[styles.primaryBtn, { marginBottom: 10 }]} onPress={() => handleStatusUpdate('in_progress')}>
                <Text style={styles.primaryBtnText}>Start Consultation</Text>
              </TouchableOpacity>
            )}
            {consultation.status === 'in_progress' && (
              <TouchableOpacity style={styles.primaryBtn} onPress={() => handleStatusUpdate('completed')}>
                <Text style={styles.primaryBtnText}>Mark Complete</Text>
              </TouchableOpacity>
            )}
            {isSpecialist && consultation.status === 'requested' && !updating && (
              <View style={styles.btnRow}>
                <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }]} onPress={() => handleStatusUpdate('accepted')}>
                  <Text style={styles.primaryBtnText}>Accept</Text>
                </TouchableOpacity>
                <View style={{ width: 12 }} />
                <TouchableOpacity style={[styles.dangerBtn, { flex: 1 }]} onPress={() => handleStatusUpdate('declined')}>
                  <Text style={styles.primaryBtnText}>Decline</Text>
                </TouchableOpacity>
              </View>
            )}
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
  container:    { flex: 1, backgroundColor: '#f8fafc' },
  title:        { fontSize: 20, fontWeight: '700', color: '#0f172a', padding: 20, paddingTop: 56, paddingBottom: 8 },
  searchWrap:   { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14 },
  searchInput:  { flex: 1, fontSize: 15, color: '#0f172a', paddingVertical: 12 },
  clearBtn:     { padding: 4 },
  clearBtnText: { fontSize: 14, color: '#94a3b8' },
  tabsWrap:     { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tabs:         { paddingHorizontal: 16, paddingVertical: 8, gap: 8, flexDirection: 'row' },
  tab:          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#f1f5f9' },
  tabActive:    { backgroundColor: '#16a34a' },
  tabText:      { fontSize: 12, fontWeight: '600', color: '#64748b' },
  tabTextActive:{ color: '#fff' },
  list:         { padding: 16, gap: 10 },
  loader:       { flex: 1, marginTop: 60 },
  card:         { backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardTop:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  channelIcon:  { fontSize: 20 },
  cardInfo:     { flex: 1 },
  cardName:     { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  cardSub:      { fontSize: 12, color: '#64748b', marginTop: 2 },
  statusPill:   { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText:{ fontSize: 10, fontWeight: '700' },
  dangerText:   { fontSize: 12, color: '#dc2626', marginTop: 6 },
  empty:        { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
  modal:        { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 16 },
  modalTitle:   { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  modalClose:   { fontSize: 22, color: '#64748b', padding: 4 },
  subId:        { fontSize: 13, color: '#94a3b8', marginBottom: 8 },
  statusBadgeLarge:     { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 20 },
  statusBadgeLargeText: { fontWeight: '700', fontSize: 13 },
  detailSection:      { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  detailSectionTitle: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  drow:         { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  drowLabel:    { fontSize: 13, color: '#64748b', fontWeight: '500' },
  drowValue:    { fontSize: 13, color: '#0f172a', fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  notes:        { fontSize: 13, color: '#374151', lineHeight: 20 },
  mlabel:       { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  minput:       { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0f172a', backgroundColor: '#fff' },
  errorBanner:  { backgroundColor: '#fee2e2', borderRadius: 8, padding: 12, marginBottom: 12 },
  errorText:    { fontSize: 13, color: '#dc2626' },
  actionArea:   { marginBottom: 16 },
  btnRow:       { flexDirection: 'row' },
  primaryBtn:   { backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText:{ color: '#fff', fontWeight: '700', fontSize: 14 },
  outlineBtn:   { borderWidth: 1.5, borderColor: '#16a34a', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  outlineBtnText:{ color: '#16a34a', fontWeight: '700', fontSize: 14 },
  dangerBtn:    { backgroundColor: '#dc2626', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
});
