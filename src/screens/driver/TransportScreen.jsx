import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { transportAPI, getErrorMessage } from '../../api/client';
import {
  Card, StatusBadge, Button, Spinner, EmptyState,
  ErrorBanner, Modal, Divider,
} from '../../components/ui';
import Colors from '../../constants/colors';
import { Typography, Spacing, Radius } from '../../constants/theme';

const STATUS_TABS = ['all', 'pending', 'accepted', 'in_transit', 'delivered'];

const TransportScreen = () => {
  const [transports, setTransports] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab]   = useState('all');
  const [error, setError]           = useState('');
  const [selected, setSelected]     = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const fetchTransports = useCallback(async () => {
    try {
      setError('');
      const params = {};
      if (activeTab !== 'all') params.status = activeTab;
      const res = await transportAPI.getTransports(params);
      setTransports(res.data?.results || res.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchTransports(); }, [fetchTransports]);

  const onRefresh = () => { setRefreshing(true); fetchTransports(); };

  const openDetail = (item) => { setSelected(item); setShowDetail(true); };

  const handleAction = async (action, id) => {
    try {
      if (action === 'accept')   await transportAPI.acceptTransport(id);
      if (action === 'start')    await transportAPI.startTransport(id);
      if (action === 'complete') await transportAPI.completeTransport(id);
      setShowDetail(false);
      fetchTransports();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => openDetail(item)} activeOpacity={0.8}>
      <Card style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <Text style={styles.cardId}>Trip #{item.id}</Text>
            <Text style={styles.cardPatient} numberOfLines={1}>
              {item.patient_name || item.referral?.patient_name || 'Patient'}
            </Text>
          </View>
          <StatusBadge status={item.status} />
        </View>

        {/* Route */}
        <View style={styles.routeRow}>
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, { backgroundColor: Colors.success }]} />
            <Text style={styles.routeText} numberOfLines={1}>{item.pickup_location || item.from_facility || 'Pickup'}</Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, { backgroundColor: Colors.danger }]} />
            <Text style={styles.routeText} numberOfLines={1}>{item.dropoff_location || item.to_facility || 'Destination'}</Text>
          </View>
        </View>

        <View style={styles.cardMeta}>
          {item.scheduled_time && (
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.metaText}>{formatDate(item.scheduled_time)}</Text>
            </View>
          )}
          {item.distance_km && (
            <View style={styles.metaItem}>
              <Ionicons name="navigate-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.metaText}>{item.distance_km} km</Text>
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transport</Text>
        <Text style={styles.headerSub}>{transports.length} assignment{transports.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsWrap}>
        <FlatList
          horizontal
          data={STATUS_TABS}
          keyExtractor={(t) => t}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
          renderItem={({ item: tab }) => (
            <TouchableOpacity
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {loading && !refreshing ? (
        <Spinner fullScreen />
      ) : (
        <FlatList
          data={transports}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, transports.length === 0 && { flex: 1 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="car-outline"
              title="No transport assignments"
              message={activeTab !== 'all' ? 'No trips with this status.' : 'Your transport assignments will appear here.'}
            />
          }
        />
      )}

      {selected && (
        <TransportDetailModal
          visible={showDetail}
          transport={selected}
          onClose={() => setShowDetail(false)}
          onAction={handleAction}
        />
      )}
    </SafeAreaView>
  );
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const TransportDetailModal = ({ visible, transport, onClose, onAction }) => {
  const [loading, setLoading] = useState(false);

  const act = async (action) => {
    setLoading(true);
    await onAction(action, transport.id);
    setLoading(false);
  };

  return (
    <Modal visible={visible} onClose={onClose} title={`Trip #${transport.id}`} size="lg">
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Status</Text>
        <StatusBadge status={transport.status} />
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Patient</Text>
        <Text style={styles.detailValue}>{transport.patient_name || '—'}</Text>
      </View>

      <Divider />

      <Text style={styles.detailSectionLabel}>Route</Text>
      <View style={styles.routeDetail}>
        <View style={styles.routeDetailPoint}>
          <Ionicons name="radio-button-on" size={16} color={Colors.success} />
          <View style={styles.routeDetailText}>
            <Text style={styles.routeDetailLabel}>Pickup</Text>
            <Text style={styles.routeDetailValue}>{transport.pickup_location || transport.from_facility || '—'}</Text>
          </View>
        </View>
        <View style={styles.routeDetailLine} />
        <View style={styles.routeDetailPoint}>
          <Ionicons name="location" size={16} color={Colors.danger} />
          <View style={styles.routeDetailText}>
            <Text style={styles.routeDetailLabel}>Destination</Text>
            <Text style={styles.routeDetailValue}>{transport.dropoff_location || transport.to_facility || '—'}</Text>
          </View>
        </View>
      </View>

      {transport.notes && (
        <>
          <Divider />
          <Text style={styles.detailSectionLabel}>Notes</Text>
          <Text style={styles.detailText}>{transport.notes}</Text>
        </>
      )}

      <Divider />

      <View style={styles.modalActions}>
        {transport.status === 'pending' && (
          <Button title="Accept Trip" icon="checkmark-circle-outline" onPress={() => act('accept')} loading={loading} fullWidth />
        )}
        {transport.status === 'accepted' && (
          <Button title="Start Trip" icon="car-outline" onPress={() => act('start')} loading={loading} fullWidth />
        )}
        {transport.status === 'in_transit' && (
          <Button title="Mark Delivered" icon="flag-outline" variant="success" onPress={() => act('complete')} loading={loading} fullWidth />
        )}
        <Button title="Close" variant="outline" onPress={onClose} fullWidth />
      </View>
    </Modal>
  );
};

const formatDate = (dt) => {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.background },
  header:      { paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  headerSub:   { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 1 },

  tabsWrap: { backgroundColor: Colors.white },
  tabs:     { paddingHorizontal: Spacing[4], paddingVertical: Spacing[2], gap: Spacing[2] },
  tab:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.gray100 },
  tabActive:    { backgroundColor: Colors.primary },
  tabText:      { fontSize: Typography.xs, fontWeight: Typography.medium, color: Colors.textSecondary },
  tabTextActive:{ color: Colors.white },

  list: { padding: Spacing[4], paddingBottom: Spacing[10] },

  card:        { marginBottom: Spacing[3] },
  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing[3] },
  cardLeft:    { flex: 1, marginRight: Spacing[3] },
  cardId:      { fontSize: Typography.xs, color: Colors.textMuted, marginBottom: 2 },
  cardPatient: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },

  routeRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing[2] },
  routePoint: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  routeDot:   { width: 8, height: 8, borderRadius: 4 },
  routeText:  { fontSize: Typography.xs, color: Colors.textSecondary, flex: 1 },
  routeLine:  { width: 20, height: 1, backgroundColor: Colors.gray300, marginHorizontal: 4 },

  cardMeta: { flexDirection: 'row', gap: Spacing[4] },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: Typography.xs, color: Colors.textMuted },

  detailRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing[2] },
  detailLabel:        { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
  detailValue:        { fontSize: Typography.sm, color: Colors.textPrimary },
  detailSectionLabel: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing[2] },
  detailText:         { fontSize: Typography.sm, color: Colors.textPrimary, lineHeight: 20 },

  routeDetail:       { marginBottom: Spacing[2] },
  routeDetailPoint:  { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[3] },
  routeDetailLine:   { width: 1, height: 20, backgroundColor: Colors.gray300, marginLeft: 8, marginVertical: 4 },
  routeDetailText:   { flex: 1 },
  routeDetailLabel:  { fontSize: Typography.xs, color: Colors.textMuted },
  routeDetailValue:  { fontSize: Typography.sm, color: Colors.textPrimary, fontWeight: Typography.medium },

  modalActions: { gap: 10 },
});

export default TransportScreen;
