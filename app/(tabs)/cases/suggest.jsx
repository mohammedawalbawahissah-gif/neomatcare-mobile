/**
 * app/(tabs)/cases/suggest.jsx
 * Referral Suggestion — runs the referral engine for a case and
 * lets the health worker pick a facility and create a referral.
 *
 * Reached after case creation: router.push(`/cases/suggest?caseId=${id}`)
 */
import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { referralsApi, api } from '../../../src/api/client'

const CONFIDENCE_COLORS = {
  HIGH:   { bg: '#dcfce7', text: '#16a34a' },
  MEDIUM: { bg: '#fef3c7', text: '#d97706' },
  LOW:    { bg: '#fee2e2', text: '#dc2626' },
}

export default function SuggestReferralScreen() {
  const { caseId } = useLocalSearchParams()
  const router     = useRouter()

  const [result,   setResult]   = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [creating, setCreating] = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
  if (!caseId) { setError('No case ID provided.'); setLoading(false); return }
  api.get(`/api/cases/${caseId}/suggest-facilities/`)
    .then(({ data }) => setResult(data))
    .catch(() => setError('Could not load referral suggestions.'))
    .finally(() => setLoading(false))
}, [caseId])

  const createReferral = async (facilityId) => {
    Alert.alert(
      'Confirm Referral',
      'Create a referral to this facility?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setCreating(true)
            try {
              await api.post('/api/referrals/create/', {
                emergency_case:        caseId,
                receiving_facility:    facilityId,
                engine_recommendation: result?.recommendations?.[0]?.facility_id,
                engine_version:        result?.engine_version || '1.0.0',
              })
              Alert.alert(
                'Referral Created',
                'The referral has been submitted to the receiving facility.',
                [{ text: 'OK', onPress: () => router.replace('/referrals') }]
              )
            } catch (err) {
              const msg = err.response?.data
                ? JSON.stringify(err.response.data)
                : 'Could not create referral.'
              Alert.alert('Error', msg)
            }
            setCreating(false)
          },
        },
      ]
    )
  }

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#16a34a" />
      <Text style={styles.loadingText}>Running referral engine...</Text>
    </View>
  )

  if (error) return (
    <View style={styles.centered}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
        <Text style={styles.retryText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  )

  const recommendations = result?.recommendations || []
  const overallConf     = CONFIDENCE_COLORS[result?.confidence] || CONFIDENCE_COLORS.LOW

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Referral Suggestions</Text>
      <Text style={styles.subtitle}>
        The engine ranked {recommendations.length} facilit{recommendations.length === 1 ? 'y' : 'ies'} for this case.
      </Text>

      {/* Overall confidence */}
      <View style={[styles.confBadge, { backgroundColor: overallConf.bg }]}>
        <Text style={[styles.confText, { color: overallConf.text }]}>
          Engine confidence: {result?.confidence}
        </Text>
      </View>

      {/* Required services */}
      {result?.required_services?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Required Services</Text>
          <View style={styles.serviceRow}>
            {result.required_services.map((s) => (
              <View key={s} style={styles.serviceChip}>
                <Text style={styles.serviceText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* No results */}
      {recommendations.length === 0 && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No suitable facility found</Text>
          <Text style={styles.emptySubtitle}>
            No facility within range has the required services. Consider manual referral.
          </Text>
        </View>
      )}

      {/* Facility cards */}
      {recommendations.map((rec, index) => {
        const conf  = CONFIDENCE_COLORS[rec.confidence] || CONFIDENCE_COLORS.LOW
        const isTop = index === 0

        return (
          <View key={rec.facility_id} style={[styles.facilityCard, isTop && styles.topCard]}>
            {isTop && (
              <View style={styles.topBadge}>
                <Text style={styles.topBadgeText}>⭐ Top Recommendation</Text>
              </View>
            )}

            <View style={styles.facilityHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.facilityName}>{rec.facility_name}</Text>
                <Text style={styles.facilityLevel}>Level {rec.facility_level} facility</Text>
              </View>
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreText}>{rec.score}</Text>
                <Text style={styles.scoreLabel}>score</Text>
              </View>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <Stat label="Distance"   value={`${rec.distance_km} km`} />
              <Stat label="Travel"     value={`~${rec.estimated_travel_minutes} min`} />
              <Stat label="Capability" value={`${Math.round(rec.capability_score * 100)}%`} />
            </View>

            {/* Confidence */}
            <View style={[styles.confPill, { backgroundColor: conf.bg }]}>
              <Text style={[styles.confPillText, { color: conf.text }]}>
                {rec.confidence} confidence
              </Text>
            </View>

            {/* Reason codes */}
            {rec.reason_codes?.length > 0 && (
              <View style={styles.reasonsRow}>
                {rec.reason_codes.slice(0, 3).map((r) => (
                  <Text key={r} style={styles.reasonChip}>
                    {r.replace(/_/g, ' ')}
                  </Text>
                ))}
              </View>
            )}

            {/* Refer button */}
            <TouchableOpacity
              style={[styles.referBtn, isTop && styles.referBtnPrimary, creating && { opacity: 0.6 }]}
              onPress={() => createReferral(rec.facility_id)}
              disabled={creating}
            >
              {creating
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.referBtnText}>
                    Refer to {rec.facility_name.split(' ')[0]}...
                  </Text>
              }
            </TouchableOpacity>
          </View>
        )
      })}

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  centered:     { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText:  { marginTop: 16, fontSize: 14, color: '#64748b' },
  errorText:    { fontSize: 15, color: '#dc2626', textAlign: 'center', marginBottom: 16 },
  retryBtn:     { backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText:    { color: '#374151', fontWeight: '600' },

  back:         { marginTop: 48, marginBottom: 8 },
  backText:     { color: '#16a34a', fontWeight: '600', fontSize: 15 },
  title:        { fontSize: 22, fontWeight: '700', color: '#0f172a', marginTop: 8 },
  subtitle:     { fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 16 },

  confBadge:    { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 16 },
  confText:     { fontSize: 12, fontWeight: '700' },

  section:      { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 10, textTransform: 'uppercase' },
  serviceRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceChip:  { backgroundColor: '#dbeafe', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  serviceText:  { fontSize: 12, color: '#2563eb', fontWeight: '600' },

  emptyBox:     { backgroundColor: '#fff', borderRadius: 12, padding: 24, alignItems: 'center' },
  emptyTitle:   { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  emptySubtitle:{ fontSize: 13, color: '#64748b', textAlign: 'center' },

  facilityCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18,
    marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  topCard:      { borderColor: '#16a34a', borderWidth: 2 },
  topBadge:     { backgroundColor: '#dcfce7', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 12 },
  topBadgeText: { fontSize: 11, color: '#16a34a', fontWeight: '700' },

  facilityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  facilityName:   { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  facilityLevel:  { fontSize: 12, color: '#64748b', marginTop: 2 },
  scoreCircle:    { alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, padding: 8, minWidth: 56 },
  scoreText:      { fontSize: 18, fontWeight: '700', color: '#16a34a' },
  scoreLabel:     { fontSize: 10, color: '#94a3b8' },

  statsRow:     { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 12 },
  stat:         { alignItems: 'center' },
  statValue:    { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  statLabel:    { fontSize: 11, color: '#64748b', marginTop: 2 },

  confPill:     { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 10 },
  confPillText: { fontSize: 11, fontWeight: '700' },

  reasonsRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  reasonChip:   { fontSize: 10, color: '#64748b', backgroundColor: '#f1f5f9', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },

  referBtn:     { backgroundColor: '#64748b', borderRadius: 10, padding: 14, alignItems: 'center' },
  referBtnPrimary: { backgroundColor: '#16a34a' },
  referBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
})
