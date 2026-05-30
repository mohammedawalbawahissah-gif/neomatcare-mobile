/**
 * app/(tabs)/cases/list.jsx
 * Full cases list — reached from Cases hub "All Cases"
 */
import { useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { casesApi } from '../../../src/api/client'

const DANGER_COLORS = {
  PPH: '#dc2626', APH: '#dc2626', RUPTURED_UTERUS: '#dc2626',
  ECLAMPSIA: '#ea580c', SEVERE_PRE_ECLAMPSIA: '#ea580c', CORD_PROLAPSE: '#dc2626',
  OBSTRUCTED_LABOUR: '#ea580c', PUERPERAL_SEPSIS: '#d97706',
  NEONATAL_DISTRESS: '#ea580c', PRETERM_LABOUR: '#d97706',
  NEONATAL_SEPSIS: '#dc2626', SEVERE_ANAEMIA: '#d97706',
  MALPRESENTATION: '#d97706', CHORIOAMNIONITIS: '#d97706',
}

export default function CasesListScreen() {
  const router = useRouter()
  const [cases,      setCases]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    try {
      const { data } = await casesApi.list()
      setCases(data)
    } catch { }
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  const renderItem = ({ item }) => {
    const signs    = item.danger_signs || []
    const topColor = DANGER_COLORS[signs[0]] || '#64748b'
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/cases/${item.id}`)}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.patient?.patient_name || 'Anonymous'}, age {item.patient?.age}</Text>
            <Text style={styles.facility}>{item.referring_facility_name || '—'}</Text>
          </View>
          {signs.length > 0 && <View style={[styles.dot, { backgroundColor: topColor }]} />}
        </View>
        {signs.length > 0 && (
          <View style={styles.signsRow}>
            {signs.slice(0, 3).map(s => (
              <View key={s} style={[styles.signBadge, { backgroundColor: (DANGER_COLORS[s] || '#64748b') + '20' }]}>
                <Text style={[styles.signText, { color: DANGER_COLORS[s] || '#64748b' }]}>
                  {s.replace(/_/g, ' ')}
                </Text>
              </View>
            ))}
            {signs.length > 3 && <Text style={styles.more}>+{signs.length - 3}</Text>}
          </View>
        )}
        <Text style={styles.complaint} numberOfLines={1}>{item.presenting_complaint}</Text>
      </TouchableOpacity>
    )
  }

  if (loading) return <ActivityIndicator style={styles.loader} color="#16a34a" />

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Cases</Text>
      </TouchableOpacity>
      <Text style={styles.title}>All Cases</Text>
      <FlatList
        data={cases}
        keyExtractor={c => c.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
        ListEmptyComponent={<Text style={styles.empty}>No cases found.</Text>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#f8fafc' },
  back:       { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 4 },
  backText:   { color: '#16a34a', fontWeight: '600', fontSize: 15 },
  title:      { fontSize: 20, fontWeight: '700', color: '#0f172a', paddingHorizontal: 20, paddingBottom: 12 },
  list:       { padding: 16, paddingTop: 4, gap: 10 },
  loader:     { flex: 1, marginTop: 60 },
  card:       { backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardTop:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  name:       { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  facility:   { fontSize: 12, color: '#64748b', marginTop: 1 },
  dot:        { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  signsRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 6 },
  signBadge:  { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  signText:   { fontSize: 10, fontWeight: '700' },
  more:       { fontSize: 11, color: '#94a3b8', alignSelf: 'center' },
  complaint:  { fontSize: 12, color: '#475569' },
  empty:      { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
})
