import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { casesApi, getErrorMessage } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Spinner, EmptyState, ErrorBanner } from '../../components/ui';
import { DangerSignList } from '../../components/ui/dangerSigns';
import Colors from '../../constants/colors';
import { Typography, Spacing, Radius, Shadow } from '../../constants/theme';

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function CasesScreen({ navigation }) {
  const { isHealthWorker, isFacilityAdmin, isSuperadmin } = useAuth();
  const canCreate = isHealthWorker || isSuperadmin;
  const showCreator = isFacilityAdmin || isSuperadmin;

  const [cases, setCases]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState('');

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const { data } = await casesApi.list();
      setCases(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderItem = ({ item: c }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => navigation.navigate('CaseDetail', { id: c.id })}>
      <View style={styles.cardIcon}>
        <Ionicons name="alert-circle-outline" size={20} color={Colors.dangerDark} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          <Text style={styles.patientLine} numberOfLines={1}>
            {c.patient_name || 'Patient'} · {c.patient_age}y{c.gestational_age_weeks ? ` · ${c.gestational_age_weeks}wk` : ''}
          </Text>
        </View>
        {showCreator && !!c.created_by_name && <Text style={styles.creatorText}>by {c.created_by_name}</Text>}
        <View style={{ marginTop: 4 }}>
          <DangerSignList signs={c.danger_signs} />
        </View>
        <Text style={styles.metaText}>
          {c.referring_facility_name} · {timeAgo(c.created_at)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Emergency Cases</Text>
          <Text style={styles.headerSub}>{cases.length} case{cases.length !== 1 ? 's' : ''}</Text>
        </View>
        {canCreate && (
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('CaseCreate')}>
            <Ionicons name="add" size={22} color={Colors.white} />
          </TouchableOpacity>
        )}
      </View>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {loading ? (
        <Spinner fullScreen />
      ) : cases.length === 0 ? (
        <EmptyState
          icon="clipboard-outline"
          title="No cases yet"
          message="Create a new emergency case to get started"
          action={canCreate ? { label: 'New Case', onPress: () => navigation.navigate('CaseCreate') } : null}
        />
      ) : (
        <FlatList
          data={cases}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: Spacing[4], gap: Spacing[2] }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing[4], paddingTop: Spacing[5], paddingBottom: Spacing[2],
  },
  headerTitle: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  headerSub:   { fontSize: Typography.xs, color: Colors.gray400, marginTop: 2 },
  addBtn: {
    width: 36, height: 36, borderRadius: Radius.full, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', ...Shadow.sm,
  },
  card: {
    flexDirection: 'row', gap: Spacing[3],
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing[3], ...Shadow.sm,
  },
  cardIcon: {
    width: 36, height: 36, borderRadius: Radius.md, backgroundColor: Colors.dangerLight,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  titleRow:     { flexDirection: 'row', alignItems: 'center' },
  patientLine:  { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textPrimary, flex: 1 },
  creatorText:  { fontSize: Typography.xs, color: Colors.gray400, marginTop: 1 },
  metaText:     { fontSize: Typography.xs, color: Colors.gray400, marginTop: 6 },
});
