/**
 * app/(tabs)/referrals/[id].jsx
 * Referral detail — shows full info and status action buttons.
 * Facility admins can accept/cancel; health workers can see timeline.
 */
import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { referralsApi } from '../../../src/api/client'
import { useAuth } from '../../../src/contexts/AuthContext'

const VALID_TRANSITIONS = {
  DRAFT:      ['PENDING', 'CANCELLED'],
  PENDING:    ['ACCEPTED', 'CANCELLED'],
  ACCEPTED:   ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['RECEIVED', 'FAILED'],
  RECEIVED:   ['COMPLETED'],
}

const STATUS_COLORS = {
  PENDING:    '#d97706',
  ACCEPTED:   '#16a34a',
  CANCELLED:  '#dc2626',
  IN_TRANSIT: '#2563eb',
  COMPLETED:  '#059669',
  FAILED:     '#dc2626',
}

export default function ReferralDetailScreen() {
  const { id } = useLocalSearchParams()
  const router  = useRouter()
  const { isFacilityAdmin, isHealthWorker } = useAuth()
  const [referral,  setReferral]  = useState(null)
  const [timeline,  setTimeline]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [updating,  setUpdating]  = useState(false)

  useEffect(() => {
    Promise.all([referralsApi.detail(id), referralsApi.timeline(id)])
      .then(([r, t]) => { setReferral(r.data); setTimeline(t.data) })
      .finally(() => setLoading(false))
  }, [id])

  const handleStatusUpdate = (newStatus) => {
    Alert.alert(
      `Mark as ${newStatus}?`,
      `Are you sure you want to update this referral to ${newStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setUpdating(true)
            try {
              const { data } = await referralsApi.updateStatus(id, newStatus)
              setReferral(data)
              const { data: t } = await referralsApi.timeline(id)
              setTimeline(t)
            } catch {
              Alert.alert('Error', 'Could not update referral status.')
            }
            setUpdating(false)
          },
        },
      ]
    )
  }

  if (loading) return <ActivityIndicator style={styles.loader} color="#16a34a" />
  if (!referral) return <Text style={styles.error}>Referral not found.</Text>

  const nextStatuses = VALID_TRANSITIONS[referral.status] || []
  const case_ = referral.emergency_case
  const patient = case_?.patient

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Referral</Text>
      <Text style={styles.refId}>{String(referral.id).slice(0, 8).toUpperCase()}</Text>

      {/* Status */}
      <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[referral.status] + '20' }]}>
        <Text style={[styles.statusText, { color: STATUS_COLORS[referral.status] || '#64748b' }]}>
          {referral.status}
        </Text>
      </View>

      {/* Patient info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Patient</Text>
        <Text style={styles.row}><Text style={styles.rowLabel}>Name: </Text>{patient?.patient_name || 'Anonymous'}</Text>
        <Text style={styles.row}><Text style={styles.rowLabel}>Age: </Text>{patient?.age}</Text>
        <Text style={styles.row}><Text style={styles.rowLabel}>Phone: </Text>{patient?.patient_phone_number || '—'}</Text>
      </View>

      {/* Danger signs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Danger Signs</Text>
        {case_?.danger_signs?.length > 0
          ? case_.danger_signs.map((s) => (
              <Text key={s} style={styles.dangerSign}>⚠ {s.replace(/_/g, ' ')}</Text>
            ))
          : <Text style={styles.row}>None recorded</Text>
        }
      </View>

      {/* Facilities */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Route</Text>
        <Text style={styles.row}><Text style={styles.rowLabel}>From: </Text>{referral.referring_facility_name}</Text>
        <Text style={styles.row}><Text style={styles.rowLabel}>To: </Text>{referral.receiving_facility_name}</Text>
      </View>

      {/* Timeline */}
      {timeline.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          {timeline.map((t) => (
            <View key={t.id} style={styles.timelineRow}>
              <Text style={styles.timelineDot}>•</Text>
              <Text style={styles.timelineText}>
                {t.from_status ? `${t.from_status} → ` : ''}{t.to_status}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Action buttons */}
      {nextStatuses.length > 0 && !updating && (
        <View style={styles.actions}>
          {nextStatuses.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.actionBtn, s === 'CANCELLED' || s === 'FAILED' ? styles.dangerBtn : styles.primaryBtn]}
              onPress={() => handleStatusUpdate(s)}
            >
              <Text style={styles.actionBtnText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {updating && <ActivityIndicator color="#16a34a" style={{ marginBottom: 24 }} />}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  back:         { marginTop: 48, marginBottom: 8 },
  backText:     { color: '#16a34a', fontWeight: '600', fontSize: 15 },
  title:        { fontSize: 22, fontWeight: '700', color: '#0f172a', marginTop: 8 },
  refId:        { fontSize: 13, color: '#94a3b8', marginBottom: 12 },
  statusBadge:  { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 20 },
  statusText:   { fontWeight: '700', fontSize: 13 },
  section:      { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  row:          { fontSize: 14, color: '#0f172a', marginBottom: 4 },
  rowLabel:     { fontWeight: '600' },
  dangerSign:   { fontSize: 14, color: '#dc2626', marginBottom: 4 },
  timelineRow:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  timelineDot:  { color: '#16a34a', marginRight: 8, fontSize: 16 },
  timelineText: { fontSize: 13, color: '#374151', flex: 1 },
  actions:      { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 32 },
  actionBtn:    { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center' },
  primaryBtn:   { backgroundColor: '#16a34a' },
  dangerBtn:    { backgroundColor: '#dc2626' },
  actionBtnText:{ color: '#fff', fontWeight: '700', fontSize: 14 },
  loader:       { flex: 1, marginTop: 80 },
  error:        { textAlign: 'center', marginTop: 80, color: '#dc2626' },
})
