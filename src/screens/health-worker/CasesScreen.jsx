import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  RefreshControl, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { casesAPI, getErrorMessage } from '../../api/client';
import {
  Card, StatusBadge, Button, Spinner, EmptyState,
  ErrorBanner, Modal, Input, Select,
} from '../../components/ui';
import Colors from '../../constants/colors';
import { Typography, Spacing, Radius } from '../../constants/theme';

const STATUS_OPTIONS = [
  { value: '',           label: 'All Statuses' },
  { value: 'active',     label: 'Active' },
  { value: 'pending',    label: 'Pending' },
  { value: 'completed',  label: 'Completed' },
  { value: 'cancelled',  label: 'Cancelled' },
];

const CasesScreen = ({ navigation }) => {
  const [cases, setCases]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError]           = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchCases = useCallback(async () => {
    try {
      setError('');
      const params = {};
      if (search)       params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await casesAPI.getCases(params);
      setCases(res.data?.results || res.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(fetchCases, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [fetchCases]);

  const onRefresh = () => { setRefreshing(true); fetchCases(); };

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => navigation.navigate('CaseDetail', { caseId: item.id })} activeOpacity={0.8}>
      <Card style={styles.caseCard}>
        <View style={styles.caseTop}>
          <View style={styles.caseLeft}>
            <Text style={styles.caseId}>Case #{item.id}</Text>
            <Text style={styles.caseName} numberOfLines={1}>
              {item.patient_name || `${item.patient?.first_name || ''} ${item.patient?.last_name || ''}`.trim() || 'Unknown Patient'}
            </Text>
          </View>
          <StatusBadge status={item.status} />
        </View>

        {item.diagnosis && (
          <Text style={styles.caseDiagnosis} numberOfLines={2}>{item.diagnosis}</Text>
        )}

        <View style={styles.caseMeta}>
          {item.facility_name && (
            <View style={styles.metaItem}>
              <Ionicons name="business-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.metaText}>{item.facility_name}</Text>
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
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Cases</Text>
          <Text style={styles.headerSub}>{cases.length} case{cases.length !== 1 ? 's' : ''}</Text>
        </View>
        <Button
          title="New Case"
          icon="add-outline"
          size="sm"
          onPress={() => setShowCreateModal(true)}
        />
      </View>

      {/* Search + filter */}
      <View style={styles.filters}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={17} color={Colors.gray400} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search cases..."
            placeholderTextColor={Colors.gray400}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={17} color={Colors.gray400} />
            </TouchableOpacity>
          )}
        </View>
        <Select
          placeholder="Status"
          value={statusFilter}
          onValueChange={setStatusFilter}
          options={STATUS_OPTIONS}
          style={styles.filterSelect}
        />
      </View>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {loading && !refreshing ? (
        <Spinner fullScreen />
      ) : (
        <FlatList
          data={cases}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, cases.length === 0 && { flex: 1 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="medical-outline"
              title="No cases found"
              message={search || statusFilter ? 'Try adjusting your search or filters.' : 'Create your first case to get started.'}
              action={!search && !statusFilter ? { label: 'New Case', onPress: () => setShowCreateModal(true) } : undefined}
            />
          }
        />
      )}

      {/* Create modal */}
      <CreateCaseModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => { setShowCreateModal(false); fetchCases(); }}
      />
    </SafeAreaView>
  );
};

// ─── Create Case Modal ────────────────────────────────────────────────────────
const CreateCaseModal = ({ visible, onClose, onCreated }) => {
  const [form, setForm]     = useState({ patient_name: '', diagnosis: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const set = (f) => (v) => { setForm((p) => ({ ...p, [f]: v })); if (errors[f]) setErrors((p) => ({ ...p, [f]: '' })); };

  const handleCreate = async () => {
    const e = {};
    if (!form.patient_name.trim()) e.patient_name = 'Patient name is required';
    if (!form.diagnosis.trim())    e.diagnosis    = 'Diagnosis is required';
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    setApiError('');
    try {
      await casesAPI.createCase(form);
      setForm({ patient_name: '', diagnosis: '', notes: '' });
      onCreated();
    } catch (err) {
      setApiError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Create New Case">
      <ErrorBanner message={apiError} onDismiss={() => setApiError('')} />
      <Input label="Patient Name" placeholder="Full name" value={form.patient_name} onChangeText={set('patient_name')} error={errors.patient_name} required />
      <Input label="Diagnosis" placeholder="Primary diagnosis" value={form.diagnosis} onChangeText={set('diagnosis')} error={errors.diagnosis} required />
      <Input label="Notes" placeholder="Additional notes" value={form.notes} onChangeText={set('notes')} multiline numberOfLines={3} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Cancel" variant="outline" onPress={onClose} style={{ flex: 1 }} />
        <Button title="Create" onPress={handleCreate} loading={loading} style={{ flex: 1 }} />
      </View>
    </Modal>
  );
};

const formatDate = (dt) => {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle:{ fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  headerSub:  { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 1 },

  filters:    { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: Spacing[4], paddingTop: Spacing[3], gap: Spacing[2], backgroundColor: Colors.white },
  searchBox:  { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing[3], height: 44, backgroundColor: Colors.white },
  searchInput:{ flex: 1, fontSize: Typography.base, color: Colors.textPrimary },
  filterSelect: { width: 120, marginBottom: 0 },

  list: { padding: Spacing[4], paddingBottom: Spacing[10] },

  caseCard:     { marginBottom: Spacing[3] },
  caseTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing[2] },
  caseLeft:     { flex: 1, marginRight: Spacing[3] },
  caseId:       { fontSize: Typography.xs, color: Colors.textMuted, marginBottom: 2 },
  caseName:     { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  caseDiagnosis:{ fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: Spacing[2] },
  caseMeta:     { flexDirection: 'row', gap: Spacing[4] },
  metaItem:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:     { fontSize: Typography.xs, color: Colors.textMuted },
});

export default CasesScreen;
