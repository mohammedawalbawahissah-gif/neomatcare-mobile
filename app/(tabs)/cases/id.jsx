/**
 * app/(tabs)/cases/[id].jsx
 * Emergency case detail — full clinical record.
 */
import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { casesApi } from '../../../src/api/client'

export default function CaseDetailScreen() {
  const { id }  = useLocalSearchParams()
  const router  = useRouter()
  const [case_, setCase]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    casesApi.detail(id)
      .then(({ data }) => setCase(data))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <ActivityIndicator style={styles.loader} color="#16a34a" />
  if (!case_)  return <Text style={styles.error}>Case not found.</Text>

  const vitals = case_.vital_signs || {}
  const signs  = case_.danger_signs || []

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Emergency Case</Text>
      <Text style={styles.caseId}>{String(case_.id).slice(0, 8).toUpperCase()}</Text>

      {/* Patient */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Patient</Text>
        <Row label="Name"     value={case_.patient?.patient_name || 'Anonymous'} />
        <Row label="Age"      value={case_.patient?.age} />
        <Row label="Phone"    value={case_.patient?.patient_phone_number || '—'} />
        <Row label="Blood"    value={case_.patient?.blood_group || '—'} />
        <Row label="ANC Visits" value={case_.patient?.anc_visits ?? '—'} />
        <Row label="District" value={case_.patient?.district || '—'} />
      </View>

      {/* Obstetrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Obstetric History</Text>
        <Row label="Gestational Age" value={case_.gestational_age_weeks ? `${case_.gestational_age_weeks} weeks` : '—'} />
        <Row label="Gravida"         value={case_.gravida ?? '—'} />
        <Row label="Parity"          value={case_.parity ?? '—'} />
        <Row label="Membranes"       value={case_.membranes_status || '—'} />
        {case_.obstetric_history ? (
          <Text style={styles.notes}>{case_.obstetric_history}</Text>
        ) : null}
      </View>

      {/* Complaint */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Presenting Complaint</Text>
        <Text style={styles.notes}>{case_.presenting_complaint}</Text>
      </View>

      {/* Danger signs */}
      {signs.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Signs</Text>
          {signs.map((s) => (
            <Text key={s} style={styles.dangerSign}>⚠ {s.replace(/_/g, ' ')}</Text>
          ))}
        </View>
      )}

      {/* Vitals */}
      {Object.keys(vitals).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vital Signs</Text>
          {vitals.systolic_bp   && <Row label="BP"          value={`${vitals.systolic_bp}/${vitals.diastolic_bp} mmHg`} />}
          {vitals.heart_rate    && <Row label="Heart Rate"  value={`${vitals.heart_rate} bpm`} />}
          {vitals.respiratory_rate && <Row label="Resp Rate" value={`${vitals.respiratory_rate} breaths/min`} />}
          {vitals.temperature   && <Row label="Temp"        value={`${vitals.temperature} °C`} />}
          {vitals.spo2          && <Row label="SpO2"        value={`${vitals.spo2}%`} />}
          {case_.fetal_heart_rate && <Row label="FHR"       value={`${case_.fetal_heart_rate} bpm`} />}
        </View>
      )}

      {/* Facility */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Origin</Text>
        <Row label="Facility"   value={case_.referring_facility_name || '—'} />
        <Row label="Created by" value={case_.created_by_name || '—'} />
      </View>
    </ScrollView>
  )
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{String(value)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  back:         { marginTop: 48, marginBottom: 8 },
  backText:     { color: '#16a34a', fontWeight: '600', fontSize: 15 },
  title:        { fontSize: 22, fontWeight: '700', color: '#0f172a', marginTop: 8 },
  caseId:       { fontSize: 13, color: '#94a3b8', marginBottom: 20 },
  section:      { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  row:          { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  rowLabel:     { fontSize: 13, color: '#64748b', fontWeight: '500' },
  rowValue:     { fontSize: 13, color: '#0f172a', fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  notes:        { fontSize: 13, color: '#374151', lineHeight: 20 },
  dangerSign:   { fontSize: 14, color: '#dc2626', marginBottom: 4 },
  loader:       { flex: 1, marginTop: 80 },
  error:        { textAlign: 'center', marginTop: 80, color: '#dc2626' },
})
