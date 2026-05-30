/**
 * app/(tabs)/admin/index.jsx
 * SuperAdmin Management Hub
 * Links to: Users, Vehicles/Drivers, Specialists
 */
import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { api } from '../../../src/api/client'
import { Users, Truck, Stethoscope, ChevronRight } from 'lucide-react-native'

export default function AdminHubScreen() {
  const router = useRouter()
  const [stats,   setStats]   = useState({})
  const [loading, setLoading] = useState(true)
  const [refresh, setRefresh] = useState(false)

  const load = async () => {
    try {
      const [users, transport, specialists] = await Promise.allSettled([
        api.get('/api/auth/users/'),
        api.get('/api/transport/'),
        api.get('/api/consultations/specialists/'),
      ])
      setStats({
        users:       users.value?.data?.length       ?? 0,
        vehicles:    transport.value?.data?.length    ?? 0,
        specialists: specialists.value?.data?.length ?? 0,
      })
    } catch { }
    setLoading(false)
    setRefresh(false)
  }

  useEffect(() => { load() }, [])

  const sections = [
    {
      icon:  <Users size={24} color="#2563eb" />,
      color: '#dbeafe',
      label: 'Users',
      sub:   'Add, view and remove platform users',
      count: stats.users,
      route: '/admin/users',
    },
    {
      icon:  <Truck size={24} color="#d97706" />,
      color: '#fef3c7',
      label: 'Vehicles & Drivers',
      sub:   'Manage transport fleet and drivers',
      count: stats.vehicles,
      route: '/admin/vehicles',
    },
    {
      icon:  <Stethoscope size={24} color="#7c3aed" />,
      color: '#ede9fe',
      label: 'Specialists',
      sub:   'Add and remove specialist profiles',
      count: stats.specialists,
      route: '/admin/specialists',
    },
  ]

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => { setRefresh(true); load() }} />}
    >
      <Text style={styles.title}>Admin</Text>
      <Text style={styles.subtitle}>Platform management</Text>

      {loading ? (
        <ActivityIndicator color="#16a34a" style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.list}>
          {sections.map((s) => (
            <TouchableOpacity
              key={s.label}
              style={styles.card}
              onPress={() => router.push(s.route)}
            >
              <View style={[styles.iconBox, { backgroundColor: s.color }]}>
                {s.icon}
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardLabel}>{s.label}</Text>
                <Text style={styles.cardSub}>{s.sub}</Text>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.cardCount}>{s.count}</Text>
                <ChevronRight size={16} color="#cbd5e1" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  title:     { fontSize: 22, fontWeight: '700', color: '#0f172a', padding: 20, paddingTop: 56, paddingBottom: 4 },
  subtitle:  { fontSize: 13, color: '#64748b', paddingHorizontal: 20, marginBottom: 20 },
  list:      { paddingHorizontal: 16, gap: 12 },
  card:      { backgroundColor: '#fff', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  iconBox:   { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardInfo:  { flex: 1 },
  cardLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  cardSub:   { fontSize: 12, color: '#64748b', marginTop: 2 },
  cardRight: { alignItems: 'center', gap: 4 },
  cardCount: { fontSize: 18, fontWeight: '700', color: '#16a34a' },
})
