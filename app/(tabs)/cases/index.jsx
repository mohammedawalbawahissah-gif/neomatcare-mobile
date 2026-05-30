/**
 * app/(tabs)/cases/index.jsx
 * Cases Hub — central menu for all case-related actions.
 * Health workers: Create Case, View Cases, View Referrals
 * Facility Admin: View Cases, Incoming Referrals
 * Superadmin: View Cases, All Referrals
 */
import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../../src/contexts/AuthContext'
import { casesApi, referralsApi } from '../../../src/api/client'
import { FilePlus, List, ArrowRightLeft, Clock } from 'lucide-react-native'

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

export default function CasesHubScreen() {
  const router = useRouter()
  const { isHealthWorker, isFacilityAdmin } = useAuth()

  const [recentCases,     setRecentCases]     = useState([])
  const [recentReferrals, setRecentReferrals] = useState([])
  const [loading,         setLoading]         = useState(true)
  const [refreshing,      setRefreshing]      = useState(false)

  const load = async () => {
    try {
      const [c, r] = await Promise.allSettled([
        casesApi.list(),
        referralsApi.list(),
      ])
      setRecentCases(c.value?.data?.slice(0, 3) || [])
      setRecentReferrals(r.value?.data?.slice(0, 3) || [])
    } catch { }
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
    >
      <Text style={styles.title}>Cases</Text>

      {/* Quick actions */}
      <View style={styles.actionsGrid}>
        {isHealthWorker && (
          <ActionCard
            icon={<FilePlus size={24} color="#16a34a" />}
            label="New Case"
            sub="Create emergency case"
            color="#dcfce7"
            onPress={() => router.push('/cases/create')}
          />
        )}
        <ActionCard
          icon={<List size={24} color="#2563eb" />}
          label="All Cases"
          sub="View case list"
          color="#dbeafe"
          onPress={() => router.push('/cases/list')}
        />
        <ActionCard
          icon={<ArrowRightLeft size={24} color="#7c3aed" />}
          label={isFacilityAdmin ? 'Incoming' : 'Referrals'}
          sub={isFacilityAdmin ? 'Review incoming referrals' : 'View all referrals'}
          color="#ede9fe"
          onPress={() => router.push('/referrals')}
        />
      </View>

      {loading ? (
        <ActivityIndicator color="#16a34a" style={{ marginTop: 24 }} />
      ) : (
        <>
          {/* Recent cases */}
          {recentCases.length > 0 && (
            <Section
              title="Recent Cases"
              onSeeAll={() => router.push('/cases/list')}
            >
              {recentCases.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.listItem}
                  onPress={() => router.push(`/cases/${c.id}`)}
                >
                  <View style={styles.listItemLeft}>
                    <Text style={styles.listItemTitle}>
                      {c.patient?.patient_name || 'Anonymous'}, age {c.patient?.age}
                    </Text>
                    <Text style={styles.listItemSub} numberOfLines={1}>
                      {c.danger_signs?.slice(0, 2).join(', ') || 'No danger signs'}
                    </Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              ))}
            </Section>
          )}

          {/* Recent referrals */}
          {recentReferrals.length > 0 && (
            <Section
              title="Recent Referrals"
              onSeeAll={() => router.push('/referrals')}
            >
              {recentReferrals.map((r) => {
                const s = STATUS_COLORS[r.status] || STATUS_COLORS.DRAFT
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={styles.listItem}
                    onPress={() => router.push(`/referrals/${r.id}`)}
                  >
                    <View style={styles.listItemLeft}>
                      <Text style={styles.listItemTitle}>
                        {isFacilityAdmin
                          ? `From: ${r.referring_facility_name || '—'}`
                          : `To: ${r.receiving_facility_name || '—'}`
                        }
                      </Text>
                      <Text style={styles.listItemSub}>
                        {r.emergency_case?.patient?.patient_name || 'Patient'}
                      </Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
                      <Text style={[styles.statusPillText, { color: s.text }]}>{r.status}</Text>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </Section>
          )}
        </>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  )
}

function ActionCard({ icon, label, sub, color, onPress }) {
  return (
    <TouchableOpacity style={[styles.actionCard, { backgroundColor: color }]} onPress={onPress}>
      <View style={styles.actionIcon}>{icon}</View>
      <Text style={styles.actionLabel}>{label}</Text>
      <Text style={styles.actionSub}>{sub}</Text>
    </TouchableOpacity>
  )
}

function Section({ title, onSeeAll, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.seeAll}>See all →</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#f8fafc' },
  title:          { fontSize: 22, fontWeight: '700', color: '#0f172a', padding: 20, paddingTop: 56, paddingBottom: 16 },

  actionsGrid:    { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12, marginBottom: 8 },
  actionCard:     { borderRadius: 14, padding: 16, width: '47%', minHeight: 100 },
  actionIcon:     { marginBottom: 10 },
  actionLabel:    { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  actionSub:      { fontSize: 11, color: '#475569' },

  section:        { marginHorizontal: 16, marginTop: 16, backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden' },
  sectionHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sectionTitle:   { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  seeAll:         { fontSize: 12, color: '#16a34a', fontWeight: '600' },
  sectionBody:    {},

  listItem:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  listItemLeft:   { flex: 1 },
  listItemTitle:  { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  listItemSub:    { fontSize: 12, color: '#64748b', marginTop: 2 },
  chevron:        { fontSize: 20, color: '#cbd5e1', marginLeft: 8 },
  statusPill:     { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText: { fontSize: 10, fontWeight: '700' },
})
