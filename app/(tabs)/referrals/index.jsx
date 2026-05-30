/**
 * app/(tabs)/referrals/index.jsx
 * Referrals list — health workers see their outgoing referrals,
 * facility admins see incoming referrals to their facility.
 */
import { useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { referralsApi } from '../../../src/api/client'
import { useAuth } from '../../../src/contexts/AuthContext'

const STATUS_COLORS = {
  DRAFT:      { bg: '#f1f5f9', text: '#64748b' },
  PENDING:    { bg: '#fef3c7', text: '#d97706' },
  ACCEPTED:   { bg: '#dcfce7', text: '#16a34a' },
  IN_TRANSIT: { bg: '#dbeafe', text: '#2563eb' },
  RECEIVED:   { bg: '#ede9fe', text: '#7c3aed' },
  COMPLETED:  { bg: '#d1fae5', text: '#059669' },
  CANCELLED:  { bg: '#fee2e2', text: '#dc2626' },
  FAILED:     { bg: '#fee2e2', text: '#dc2626' },
}

export default function ReferralsScreen() {
  const router = useRouter()
  const { isFacilityAdmin } = useAuth()
  const [referrals, setReferrals] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    try {
      const { data } = await referralsApi.list()
      setReferrals(data)
    } catch { }
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  const renderItem = ({ item }) => {
    const s = STATUS_COLORS[item.status] || STATUS_COLORS.DRAFT
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(tabs)/referrals/${item.id}`)}
      >
        <View style={styles.cardTop}>
          <Text style={styles.patientName}>
            {item.emergency_case?.patient?.patient_name || 'Patient'}
          </Text>
          <View style={[styles.badge, { backgroundColor: s.bg }]}>
            <Text style={[styles.badgeText, { color: s.text }]}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.meta}>
          {isFacilityAdmin
            ? `From: ${item.referring_facility_name || '—'}`
            : `To: ${item.receiving_facility_name || '—'}`
          }
        </Text>
        <Text style={styles.meta}>
          {item.emergency_case?.danger_signs?.join(', ') || 'No danger signs recorded'}
        </Text>
      </TouchableOpacity>
    )
  }

  if (loading) return <ActivityIndicator style={styles.loader} color="#16a34a" />

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isFacilityAdmin ? 'Incoming Referrals' : 'Referrals'}
      </Text>
      <FlatList
        data={referrals}
        keyExtractor={(r) => r.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
        ListEmptyComponent={
          <Text style={styles.empty}>No referrals found.</Text>
        }
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
  cardTop:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  patientName:{ fontSize: 15, fontWeight: '600', color: '#0f172a' },
  badge:      { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText:  { fontSize: 11, fontWeight: '700' },
  meta:       { fontSize: 12, color: '#64748b', marginTop: 2 },
  empty:      { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
})
