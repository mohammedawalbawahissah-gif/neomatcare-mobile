import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, StyleSheet, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { consultationsAPI, getErrorMessage } from '../../api/client';
import {
  Card, StatusBadge, Button, Spinner, EmptyState,
  ErrorBanner, Modal, Input, Divider,
} from '../../components/ui';
import Colors from '../../constants/colors';
import { Typography, Spacing, Radius } from '../../constants/theme';

const STATUS_TABS = ['all', 'pending', 'in_progress', 'completed'];

const ConsultationsScreen = () => {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [activeTab, setActiveTab]         = useState('all');
  const [search, setSearch]               = useState('');
  const [error, setError]                 = useState('');
  const [selected, setSelected]           = useState(null);
  const [showDetail, setShowDetail]       = useState(false);

  const fetchConsultations = useCallback(async () => {
    try {
      setError('');
      const params = {};
      if (activeTab !== 'all') params.status = activeTab;
      if (search)              params.search = search;
      const res = await consultationsAPI.getConsultations(params);
      setConsultations(res.data?.results || res.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, search]);

  useEffect(() => {
    const t = setTimeout(fetchConsultations, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [fetchConsultations]);

  const onRefresh = () => { setRefreshing(true); fetchConsultations(); };

  const openDetail = (item) => { setSelected(item); setShowDetail(true); };

  const handleUpdate = async (id, data) => {
    try {
      await consultationsAPI.updateConsultation(id, data);
      setShowDetail(false);
      fetchConsultations();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => openDetail(item)} activeOpacity={0.8}>
      <Card style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <Text style={styles.cardId}>Consultation #{item.id}</Text>
            <Text style={styles.cardPatient} numberOfLines={1}>
              {item.patient_name || item.referral?.patient_name || 'Patient'}
            </Text>
          </View>
          <StatusBadge status={item.status} />
        </View>

        {item.subject && (
          <Text style={styles.cardSubject} numberOfLines={2}>{item.subject}</Text>
        )}

        <View style={styles.cardMeta}>
          {item.referring_facility && (
            <View style={styles.metaItem}>
              <Ionicons name="business-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.metaText}>{item.referring_facility}</Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.metaText}>{formatDate(item.created_at)}</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Consultations</Text>
        <Text style={styles.headerSub}>{consultations.length} total</Text>
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={17} color={Colors.gray400} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search consultations..."
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

      {/* Tabs */}
      <View style={styles.tabs}>
        {STATUS_TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {loading && !refreshing ? (
        <Spinner fullScreen />
      ) : (
        <FlatList
          data={consultations}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, consultations.length === 0 && { flex: 1 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubbles-outline"
              title="No consultations"
              message={search || activeTab !== 'all' ? 'Try adjusting your filters.' : 'Consultations assigned to you will appear here.'}
            />
          }
        />
      )}

      {selected && (
        <ConsultationDetailModal
          visible={showDetail}
          consultation={selected}
          onClose={() => setShowDetail(false)}
          onUpdate={handleUpdate}
        />
      )}
    </SafeAreaView>
  );
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const ConsultationDetailModal = ({ visible, consultation, onClose, onUpdate }) => {
  const [note, setNote]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [apiError, setApiError] = useState('');

  const addNote = async () => {
    if (!note.trim()) return;
    setLoading(true);
    try {
      await consultationsAPI.addNote(consultation.id, { content: note });
      setNote('');
      setShowNote(false);
      onUpdate(consultation.id, {});
    } catch (err) {
      setApiError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title={`Consultation #${consultation.id}`} size="lg">
      <ErrorBanner message={apiError} onDismiss={() => setApiError('')} />

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Status</Text>
        <StatusBadge status={consultation.status} />
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Patient</Text>
        <Text style={styles.detailValue}>{consultation.patient_name || '—'}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Date</Text>
        <Text style={styles.detailValue}>{formatDate(consultation.created_at)}</Text>
      </View>

      {consultation.subject && (
        <View style={styles.detailBlock}>
          <Text style={styles.detailLabel}>Subject</Text>
          <Text style={styles.detailText}>{consultation.subject}</Text>
        </View>
      )}
      {consultation.notes && (
        <View style={styles.detailBlock}>
          <Text style={styles.detailLabel}>Notes</Text>
          <Text style={styles.detailText}>{consultation.notes}</Text>
        </View>
      )}

      <Divider />

      {showNote ? (
        <View>
          <Input label="Add Note" placeholder="Enter your note..." value={note} onChangeText={setNote} multiline numberOfLines={3} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Cancel" variant="ghost" size="sm" onPress={() => setShowNote(false)} style={{ flex: 1 }} />
            <Button title="Save Note" size="sm" loading={loading} onPress={addNote} style={{ flex: 1 }} />
          </View>
        </View>
      ) : (
        <View style={styles.modalActions}>
          {consultation.status === 'pending' && (
            <Button title="Start Consultation" onPress={() => onUpdate(consultation.id, { status: 'in_progress' })} fullWidth />
          )}
          {consultation.status === 'in_progress' && (
            <>
              <Button title="Add Note" variant="outline" icon="create-outline" onPress={() => setShowNote(true)} style={{ flex: 1 }} />
              <Button title="Complete" icon="checkmark-circle-outline" onPress={() => onUpdate(consultation.id, { status: 'completed' })} style={{ flex: 1 }} />
            </>
          )}
          <Button title="Close" variant="outline" onPress={onClose} fullWidth />
        </View>
      )}
    </Modal>
  );
};

const formatDate = (dt) => {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  headerSub:   { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 1 },

  searchWrap:  { backgroundColor: Colors.white, paddingHorizontal: Spacing[4], paddingVertical: Spacing[2] },
  searchBox:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing[3], height: 44 },
  searchInput: { flex: 1, fontSize: Typography.base, color: Colors.textPrimary },

  tabs:          { flexDirection: 'row', backgroundColor: Colors.white, paddingHorizontal: Spacing[4], paddingBottom: Spacing[2], gap: Spacing[2] },
  tab:           { paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.gray100 },
  tabActive:     { backgroundColor: Colors.primary },
  tabText:       { fontSize: Typography.xs, fontWeight: Typography.medium, color: Colors.textSecondary },
  tabTextActive: { color: Colors.white },

  list: { padding: Spacing[4], paddingBottom: Spacing[10] },

  card:        { marginBottom: Spacing[3] },
  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing[2] },
  cardLeft:    { flex: 1, marginRight: Spacing[3] },
  cardId:      { fontSize: Typography.xs, color: Colors.textMuted, marginBottom: 2 },
  cardPatient: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  cardSubject: { fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: Spacing[2] },
  cardMeta:    { flexDirection: 'row', gap: Spacing[4] },
  metaItem:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:    { fontSize: Typography.xs, color: Colors.textMuted },

  detailRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing[2] },
  detailBlock: { paddingVertical: Spacing[2] },
  detailLabel: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
  detailValue: { fontSize: Typography.sm, color: Colors.textPrimary },
  detailText:  { fontSize: Typography.sm, color: Colors.textPrimary, marginTop: 4, lineHeight: 20 },
  modalActions:{ gap: 10, marginTop: Spacing[2] },
});

export default ConsultationsScreen;
