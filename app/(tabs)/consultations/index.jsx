/**
 * app/(tabs)/consultations/index.jsx
 * Consultations Hub — clean menu for consultation actions.
 * Health workers: Request consultation, My consultations
 * Specialists: Queue, My consultations
 * Superadmin: All consultations
 */
import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../../src/contexts/AuthContext'
import { consultationsApi } from '../../../src/api/client'
import { MessageSquarePlus, ClipboardList, Clock } from 'lucide-react-native'

const STATUS_COLORS = {
  requested:   { bg: '#fef3c7', text: '#d97706' },
  accepted:    { bg: '#dcfce7', text: '#16a34a' },
  in_progress: { bg: '#dbeafe', text: '#2563eb' },
  completed:   { bg: '#d1fae5', text: '#059669' },
  declined:    { bg: '#fee2e2', text: '#dc2626' },
  missed:      { bg: '#f1f5f9', text: '#64748b' },
}

const CHANNEL_ICONS = { video: '📹', audio: '📞', text: '💬' }

export default function ConsultationsHubScreen() {
  const router = useRouter()
  const { isSpecialist, isHealthWorker } = useAuth()

  const [recent,     setRecent]     = useState([])
  const [pending,    setPending]    = useState(0)
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    try {
      const { data } = isSpecialist
        ? await consultationsApi.queue()
        : await consultationsApi.list()
      setRecent(data.slice(0, 4))
      setPending(data.filter(c => c.status === 'requested').length)
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
      <Text style={styles.title}>Consultations</Text>

      {/* Pending badge */}
      {pending > 0 && (
        <View style={styles.alertBox}>
          <Text style={styles.alertText}>
            🔔 {pending} consultation{pending > 1 ? 's' : ''} awaiting response
          </Text>
        </View>
      )}

      {/* Action cards */}
      <View style={styles.actionsGrid}>
        {isSpecialist && (
          <ActionCard
            icon={<ClipboardList size={24} color="#7c3aed" />}
            label="My Queue"
            sub="Pending requests"
            color="#ede9fe"
            badge={pending > 0 ? pending : null}
            onPress={() => router.push('/consultations/list')}
          />
        )}
        {isHealthWorker && (
          <ActionCard
            icon={<MessageSquarePlus size={24} color="#16a34a" />}
            label="Request"
            sub="New consultation"
            color="#dcfce7"
            onPress={() => router.push('/consultations/list')}
          />
        )}
        <ActionCard
          icon={<Clock size={24} color="#2563eb" />}
          label="History"
          sub="All consultations"
          color="#dbeafe"
          onPress={() => router.push('/consultations/list')}
        />
      </View>

      {/* Recent */}
      {loading ? (
        <ActivityIndicator color="#16a34a" style={{ marginTop: 24 }} />
      ) : recent.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {isSpecialist ? 'Queue' : 'Recent Consultations'}
            </Text>
            <TouchableOpacity onPress={() => router.push('/consultations/list')}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>

          {recent.map((c) => {
            const s = STATUS_COLORS[c.status] || STATUS_COLORS.missed
            return (
              <TouchableOpacity
                key={c.id}
                style={styles.listItem}
                onPress={() => router.push(`/consultations/${c.id}`)}
              >
                <Text style={styles.channelIcon}>
                  {CHANNEL_ICONS[c.channel] || '💬'}
                </Text>
                <View style={styles.listItemInfo}>
                  <Text style={styles.listItemTitle}>
                    {c.specialist_name
                      ? `Dr. ${c.specialist_name}`
                      : 'Awaiting specialist'}
                  </Text>
                  <Text style={styles.listItemSub}>
                    Patient age {c.emergency_case?.patient?.age || '—'} · {c.specialty || '—'}
                  </Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
                  <Text style={[styles.statusText, { color: s.text }]}>
                    {c.status.toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>
            )
          })}
        </View>
      ) : (
        <Text style={styles.empty}>No consultations yet.</Text>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  )
}

function ActionCard({ icon, label, sub, color, badge, onPress }) {
  return (
    <TouchableOpacity style={[styles.actionCard, { backgroundColor: color }]} onPress={onPress}>
      <View style={styles.iconRow}>
        {icon}
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
      <Text style={styles.actionSub}>{sub}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#f8fafc' },
  title:          { fontSize: 22, fontWeight: '700', color: '#0f172a', padding: 20, paddingTop: 56, paddingBottom: 16 },

  alertBox:       { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#fef3c7', borderRadius: 10, padding: 12 },
  alertText:      { fontSize: 13, color: '#d97706', fontWeight: '600' },

  actionsGrid:    { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12, marginBottom: 8 },
  actionCard:     { borderRadius: 14, padding: 16, width: '47%', minHeight: 100 },
  iconRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  badge:          { backgroundColor: '#dc2626', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  badgeText:      { color: '#fff', fontSize: 11, fontWeight: '700' },
  actionLabel:    { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  actionSub:      { fontSize: 11, color: '#475569' },

  section:        { marginHorizontal: 16, marginTop: 16, backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden' },
  sectionHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sectionTitle:   { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  seeAll:         { fontSize: 12, color: '#16a34a', fontWeight: '600' },

  listItem:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f8fafc', gap: 10 },
  channelIcon:    { fontSize: 20 },
  listItemInfo:   { flex: 1 },
  listItemTitle:  { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  listItemSub:    { fontSize: 12, color: '#64748b', marginTop: 2 },
  statusPill:     { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText:     { fontSize: 10, fontWeight: '700' },
  empty:          { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
})
