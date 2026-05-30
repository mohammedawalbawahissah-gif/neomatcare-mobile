/**
 * app/(tabs)/transport/index.jsx
 * Transport requests — drivers see their assigned dispatches.
 */
import { useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator, Alert,
} from 'react-native'
import { transportApi } from '../../../src/api/client'

const STATUS_COLORS = {
  requested:  { bg: '#fef3c7', text: '#d97706' },
  accepted:   { bg: '#dcfce7', text: '#16a34a' },
  dispatched: { bg: '#dbeafe', text: '#2563eb' },
  arrived:    { bg: '#ede9fe', text: '#7c3aed' },
  completed:  { bg: '#d1fae5', text: '#059669' },
  cancelled:  { bg: '#fee2e2', text: '#dc2626' },
}

const NEXT_STATUS = {
  requested:  'accepted',
  accepted:   'dispatched',
  dispatched: 'arrived',
  arrived:    'completed',
}

export default function TransportScreen() {
  const [requests, setRequests]   = useState([])
  const [loading,  setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    try {
      const { data } = await transportApi.requests.list()
      setRequests(data)
    } catch { }
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  const updateStatus = async (id, newStatus) => {
    try {
      await transportApi.requests.updateStatus(id, { status: newStatus })
      load()
    } catch {
      Alert.alert('Error', 'Could not update transport status.')
    }
  }

  const renderItem = ({ item }) => {
    const s    = STATUS_COLORS[item.status] || STATUS_COLORS.requested
    const next = NEXT_STATUS[item.status]
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.caseId}>Case #{String(item.emergency_case).slice(0, 8).toUpperCase()}</Text>
          <View style={[styles.badge, { backgroundColor: s.bg }]}>
            <Text style={[styles.badgeText, { color: s.text }]}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.meta}>From: {item.pickup_facility_name || 'Community pickup'}</Text>
        <Text style={styles.meta}>To: {item.destination_facility_name || '—'}</Text>
        {item.pickup_notes ? <Text style={styles.meta}>Notes: {item.pickup_notes}</Text> : null}
        {item.estimated_minutes && (
          <Text style={styles.meta}>Est: {item.estimated_minutes} min</Text>
        )}
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
      </View>
    )
  }

  if (loading) return <ActivityIndicator style={styles.loader} color="#16a34a" />

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Transport</Text>
      <FlatList
        data={requests}
        keyExtractor={(r) => r.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
        ListEmptyComponent={<Text style={styles.empty}>No transport requests assigned.</Text>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  title:     { fontSize: 20, fontWeight: '700', color: '#0f172a', padding: 20, paddingTop: 56 },
  list:      { padding: 16, paddingTop: 0, gap: 12 },
  loader:    { flex: 1, marginTop: 60 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  caseId:      { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  badge:       { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText:   { fontSize: 10, fontWeight: '700' },
  meta:        { fontSize: 12, color: '#64748b', marginBottom: 2 },
  actionBtn:   { marginTop: 12, backgroundColor: '#16a34a', borderRadius: 8, padding: 10, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  empty:       { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
})
