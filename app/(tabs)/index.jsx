/**
 * app/(tabs)/index.jsx
 * Dashboard — role-aware summary for all users.
 */
import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../src/contexts/AuthContext'
import { casesApi, referralsApi, consultationsApi, transportApi } from '../../src/api/client'

const ROLE_LABELS = {
  health_worker:  'Health Worker',
  facility_admin: 'Facility Admin',
  specialist:     'Specialist',
  driver:         'Driver',
  superadmin:     'Superadmin',
}

export default function DashboardScreen() {
  const { user, logout, isHealthWorker, isFacilityAdmin, isSpecialist, isDriver, isSuperadmin } = useAuth()
  const router    = useRouter()
  const [stats,   setStats]     = useState({})
  const [loading, setLoading]   = useState(true)
  const [refresh, setRefresh]   = useState(false)

  const loadStats = async () => {
    try {
      const results = await Promise.allSettled([
        casesApi.list(),
        referralsApi.list(),
        consultationsApi.list(),
        transportApi.requests.list(),
      ])
      setStats({
        cases:         results[0].value?.data?.length ?? 0,
        referrals:     results[1].value?.data?.length ?? 0,
        consultations: results[2].value?.data?.length ?? 0,
        transport:     results[3].value?.data?.length ?? 0,
      })
    } catch { }
    setLoading(false)
    setRefresh(false)
  }

  useEffect(() => { loadStats() }, [])

  const cards = [
  (isHealthWorker || isSuperadmin) && { label: 'Cases', value: stats.cases, color: '#16a34a', route: '/cases' },
  (isHealthWorker || isFacilityAdmin || isSuperadmin) && { label: 'Referrals', value: stats.referrals, color: '#2563eb', route: '/referrals' },
  (isHealthWorker || isSpecialist || isSuperadmin) && { label: 'Consultations', value: stats.consultations, color: '#7c3aed', route: '/consultations' },
  (isDriver || isSuperadmin) && { label: 'Transport', value: stats.transport, color: '#d97706', route: '/transport' },
].filter(Boolean)

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => { setRefresh(true); loadStats() }} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{ROLE_LABELS[user?.role]}</Text>
          </View>
        </View>
        {user?.facility_name && (
          <Text style={styles.facility}>{user.facility_name}</Text>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color="#16a34a" style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Stats cards */}
          <View style={styles.grid}>
            {cards.map((card) => (
              <TouchableOpacity
                key={card.label}
                style={[styles.card, { borderLeftColor: card.color }]}
                onPress={() => router.push(card.route)}
              >
                <Text style={[styles.cardValue, { color: card.color }]}>{card.value}</Text>
                <Text style={styles.cardLabel}>{card.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Quick action for health workers */}
          {isHealthWorker && (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push('/(tabs)/cases/create')}
            >
              <Text style={styles.primaryBtnText}>+ New Emergency Case</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    backgroundColor: '#fff', padding: 24, paddingTop: 56,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  greeting:    { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  roleBadge: {
    marginTop: 4, backgroundColor: '#dcfce7', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start',
  },
  roleText:  { fontSize: 11, color: '#16a34a', fontWeight: '600' },
  facility:  { fontSize: 12, color: '#64748b', textAlign: 'right', maxWidth: 140 },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    padding: 16, gap: 12,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    width: '47%', borderLeftWidth: 3,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardValue:  { fontSize: 28, fontWeight: '700' },
  cardLabel:  { fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: '500' },
  primaryBtn: {
    margin: 16, backgroundColor: '#16a34a', borderRadius: 12,
    padding: 16, alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
