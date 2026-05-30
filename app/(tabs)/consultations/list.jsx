/**
 * app/(tabs)/consultations/list.jsx
 * Full consultations list — reached from Consultations hub
 */
import { useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../../src/contexts/AuthContext'
import { consultationsApi } from '../../../src/api/client'

const STATUS_COLORS = {
  requested:   { bg: '#fef3c7', text: '#d97706' },
  accepted:    { bg: '#dcfce7', text: '#16a34a' },
  in_progress: { bg: '#dbeafe', text: '#2563eb' },
  completed:   { bg: '#d1fae5', text: '#059669' },
  declined:    { bg: '#fee2e2', text: '#dc2626' },
  missed:      { bg: '#f1f5f9', text: '#64748b' },
}

export default function ConsultationsListScreen() {
  const router = useRouter()
  const { isSpecialist } = useAuth()
  const [items,      setItems]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    try {
      const { data } = isSpecialist
        ? await consultationsApi.queue()
        : await consultationsApi.list()
      setItems(data)
    } catch { }
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  const renderItem = ({ item }) => {
    const s = STATUS_COLORS[item.status] || STATUS_COLORS.missed
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/consultations/${item.id}`)}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>
              {item.specialist_name ? `Dr. ${item.specialist_name}` : 'Awaiting specialist'}
            </Text>
            <Text style={styles.sub}>
              Patient age {item.emergency_case?.patient?.age || '—'} · {item.specialty || '—'}
            </Text>
          </View>
          <View style={[styles.pill, { backgroundColor: s.bg }]}>
            <Text style={[styles.pillText, { color: s.text }]}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        {item.emergency_case?.danger_signs?.length > 0 && (
          <Text style={styles.signs} numberOfLines={1}>
            ⚠ {item.emergency_case.danger_signs.slice(0, 2).map(s => s.replace(/_/g, ' ')).join(', ')}
          </Text>
        )}
      </TouchableOpacity>
    )
  }

  if (loading) return <ActivityIndicator style={styles.loader} color="#16a34a" />

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Consultations</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{isSpecialist ? 'My Queue' : 'All Consultations'}</Text>
      <FlatList
        data={items}
        keyExtractor={c => c.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
        ListEmptyComponent={<Text style={styles.empty}>No consultations found.</Text>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  back:      { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 4 },
  backText:  { color: '#16a34a', fontWeight: '600', fontSize: 15 },
  title:     { fontSize: 20, fontWeight: '700', color: '#0f172a', paddingHorizontal: 20, paddingBottom: 12 },
  list:      { padding: 16, paddingTop: 4, gap: 10 },
  loader:    { flex: 1, marginTop: 60 },
  card:      { backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardTop:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  name:      { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  sub:       { fontSize: 12, color: '#64748b', marginTop: 2 },
  pill:      { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  pillText:  { fontSize: 10, fontWeight: '700' },
  signs:     { fontSize: 12, color: '#dc2626', marginTop: 6 },
  empty:     { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
})
