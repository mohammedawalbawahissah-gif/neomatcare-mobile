import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, StyleSheet, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { referralsAPI, getErrorMessage } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import {
  Card, StatusBadge, Button, Spinner, EmptyState,
  ErrorBanner, Modal, Input, Divider,
} from '../../components/ui';
import Colors from '../../constants/colors';
import { Typography, Spacing, Radius } from '../../constants/theme';

const STATUS_TABS = ['all', 'pending', 'accepted', 'completed', 'rejected'];

const ReferralsScreen = () => {
  const { userRole } = useAuth();
  const isSpecialist = userRole === 'specialist';

  const [referrals, setReferrals]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab]   = useState('all');
  const [search, setSearch]         = useState('');
  const [error, setError]           = useState('');
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [showDetailModal, setShowDetailModal]   = useState(false);

  const fetchReferrals = useCallback(async () => {
    try {
      setError('');
      const params = {};
      if (activeTab !== 'all') params.status = activeTab;
      if (search)              params.search = search;
      const res = await referralsAPI.getReferrals(params);
      setReferrals(res.data?.results || res.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, search]);

  useEffect(() => {
    const t = setTimeout(fetchReferrals, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [fetchReferrals]);

  const onRefresh = () => { setRefreshing(true); fetchReferrals(); };

  const openDetail = (item) => {
    setSelectedReferral(item);
    setShowDetailModal(true);
  };

  const handleAction = async (action, id, data) => {
    try {
      if (action === 'accept')   await referralsAPI.acceptReferral(id);
      if (action === 'reject')   await referralsAPI.rejectReferral(id, data);
      if (action === 'complete') await referralsAPI.completeReferral(id);
      setShowDetailModal(false);
      fetchReferrals();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => openDetail(item)} activeOpacity={0.8}>
      <Card style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <Text style={styles.cardId}>Referral #{item.id}</Text>
            <Text style={styles.cardPatient} numberOfLines={1}>
              {item.patient_name || item.case?.patient_name || 'Patient'}
            </Text>
          </View>
          <StatusBadge status={item.status} />
        </View>

        <View style={styles.cardRoute}>
          <View style={styles.facilityBox}>
            <Text style={styles.facilityLabel}>From</Text>
            <Text style={styles.facilityName} numberOfLines={1}>{item.from_facility_name || '—'}</Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color={Colors.gray400} />
          <View style={[styles.facilityBox, { alignItems: 'flex-end' }]}>
            <Text style={styles.facilityLabel}>To</Text>
            <Text style={styles.facilityName} numberOfLines={1}>{item.to_facility_name || '—'}</Text>
          </View>
        </View>

        {item.reason && (
          <Text style={styles.cardReason} numberOfLines={2}>{item.reason}</Text>
        )}

        <View style={styles.cardMeta}>
          {item.priority && (
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority).bg }]}>
              <Text style={[styles.priorityText, { color: getPriorityColor(item.priority).text }]}>
                {item.priority.toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Referrals</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={17} color={Colors.gray400} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search referrals..."
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

      {/* Status tabs */}
      <View style={styles.tabs}>
        {STATUS_TABS.map((tab) => (
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
      </View>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {loading && !refreshing ? (
        <Spinner fullScreen />
      ) : (
        <FlatList
          data={referrals}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, referrals.length === 0 && { flex: 1 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="swap-horizontal-outline"
              title="No referrals found"
              message={search || activeTab !== 'all' ? 'Try adjusting your filters.' : 'No referrals yet.'}
            />
          }
        />
      )}

      {/* Detail modal */}
      {selectedReferral && (
        <ReferralDetailModal
          visible={showDetailModal}
          referral={selectedReferral}
          isSpecialist={isSpecialist}
          onClose={() => setShowDetailModal(false)}
          onAction={handleAction}
        />
      )}
    </SafeAreaView>
  );
};

// ─── Referral Detail Modal ────────────────────────────────────────────────────
const ReferralDetailModal = ({ visible, referral, isSpecialist, onClose, onAction }) => {
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject]     = useState(false);
  const [loading, setLoading]           = useState(false);

  const act = async (action, data) => {
    setLoading(true);
    await onAction(action, referral.id, data);
    setLoading(false);
  };

  return (
    <Modal visible={visible} onClose={onClose} title={`Referral #${referral.id}`} size="lg">
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Status</Text>
        <StatusBadge status={referral.status} />
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Patient</Text>
        <Text style={styles.detailValue}>{referral.patient_name || '—'}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>From</Text>
        <Text style={styles.detailValue}>{referral.from_facility_name || '—'}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>To</Text>
        <Text style={styles.detailValue}>{referral.to_facility_name || '—'}</Text>
      </View>
      {referral.reason && (
        <View style={styles.detailBlock}>
          <Text style={styles.detailLabel}>Reason</Text>
          <Text style={styles.detailText}>{referral.reason}</Text>
        </View>
      )}
      {referral.notes && (
        <View style={styles.detailBlock}>
          <Text style={styles.detailLabel}>Notes</Text>
          <Text style={styles.detailText}>{referral.notes}</Text>
        </View>
      )}

      <Divider />

      {/* Reject inline */}
      {showReject && (
        <View style={styles.rejectBox}>
          <Input label="Reason for rejection" placeholder="Enter reason..." value={rejectReason} onChangeText={setRejectReason} multiline numberOfLines={2} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Cancel" variant="ghost" size="sm" onPress={() => setShowReject(false)} style={{ flex: 1 }} />
            <Button title="Confirm Reject" variant="danger" size="sm" loading={loading} onPress={() => act('reject', { reason: rejectReason })} style={{ flex: 1 }} />
          </View>
        </View>
      )}

      {/* Action buttons — specialist only for accept/reject, health worker for complete */}
      <View style={styles.modalActions}>
        {isSpecialist && referral.status === 'pending' && !showReject && (
          <>
            <Button title="Accept" variant="success" onPress={() => act('accept')} loading={loading} style={{ flex: 1 }} />
            <Button title="Reject" variant="danger"  onPress={() => setShowReject(true)} style={{ flex: 1 }} />
          </>
        )}
        {referral.status === 'accepted' && (
          <Button title="Mark Completed" onPress={() => act('complete')} loading={loading} fullWidth />
        )}
        {!showReject && (
          <Button title="Close" variant="outline" onPress={onClose} fullWidth />
        )}
      </View>
    </Modal>
  );
};

const getPriorityColor = (p) => {
  const map = { urgent: { bg: Colors.dangerLight, text: Colors.dangerDark }, emergency: { bg: '#fce7f3', text: '#9d174d' }, normal: { bg: Colors.gray100, text: Colors.gray600 } };
  return map[p?.toLowerCase()] || map.normal;
};

const formatDate = (dt) => {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },

  searchWrap: { backgroundColor: Colors.white, paddingHorizontal: Spacing[4], paddingVertical: Spacing[2] },
  searchBox:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing[3], height: 44 },
  searchInput:{ flex: 1, fontSize: Typography.base, color: Colors.textPrimary },

  tabs:         { flexDirection: 'row', backgroundColor: Colors.white, paddingHorizontal: Spacing[4], paddingBottom: Spacing[2], gap: Spacing[2] },
  tab:          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.gray100 },
  tabActive:    { backgroundColor: Colors.primary },
  tabText:      { fontSize: Typography.xs, fontWeight: Typography.medium, color: Colors.textSecondary },
  tabTextActive:{ color: Colors.white },

  list: { padding: Spacing[4], paddingBottom: Spacing[10] },

  card:        { marginBottom: Spacing[3] },
  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing[2] },
  cardLeft:    { flex: 1, marginRight: Spacing[3] },
  cardId:      { fontSize: Typography.xs, color: Colors.textMuted, marginBottom: 2 },
  cardPatient: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  cardRoute:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing[2] },
  facilityBox: { flex: 1 },
  facilityLabel:{ fontSize: Typography.xs, color: Colors.textMuted },
  facilityName: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textPrimary },
  cardReason:  { fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: Spacing[2] },
  cardMeta:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  priorityText:  { fontSize: 10, fontWeight: Typography.bold },
  cardDate:    { fontSize: Typography.xs, color: Colors.textMuted },

  detailRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing[2] },
  detailBlock: { paddingVertical: Spacing[2] },
  detailLabel: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
  detailValue: { fontSize: Typography.sm, color: Colors.textPrimary, flex: 1, textAlign: 'right' },
  detailText:  { fontSize: Typography.sm, color: Colors.textPrimary, marginTop: 4, lineHeight: 20 },
  rejectBox:   { backgroundColor: Colors.dangerLight + '60', padding: Spacing[3], borderRadius: Radius.md, marginBottom: Spacing[3] },
  modalActions:{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: Spacing[2] },
});

export default ReferralsScreen;
