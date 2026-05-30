/**
 * app/(tabs)/consultations/[id].jsx
 * Consultation detail.
 * Specialists can accept or decline.
 * Health workers can see status and messages.
 */
import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, TextInput,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { consultationsApi } from '../../../src/api/client'
import { useAuth } from '../../../src/contexts/AuthContext'

const STATUS_COLORS = {
  requested:   '#d97706',
  accepted:    '#16a34a',
  in_progress: '#2563eb',
  completed:   '#059669',
  declined:    '#dc2626',
  missed:      '#64748b',
}

export default function ConsultationDetailScreen() {
  const { id }  = useLocalSearchParams()
  const router  = useRouter()
  const { isSpecialist } = useAuth()

  const [consultation, setConsultation] = useState(null)
  const [messages,     setMessages]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [updating,     setUpdating]     = useState(false)
  const [newMessage,   setNewMessage]   = useState('')
  const [sending,      setSending]      = useState(false)

  const load = async () => {
    try {
      const [c, m] = await Promise.all([
        consultationsApi.detail(id),
        consultationsApi.messages.list(id),
      ])
      setConsultation(c.data)
      setMessages(m.data)
    } catch { }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const handleStatusUpdate = (newStatus) => {
    Alert.alert(
      `${newStatus === 'accepted' ? 'Accept' : 'Decline'} Consultation?`,
      '',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setUpdating(true)
            try {
              const { data } = await consultationsApi.updateStatus(id, { status: newStatus })
              setConsultation(data)
            } catch {
              Alert.alert('Error', 'Could not update consultation.')
            }
            setUpdating(false)
          },
        },
      ]
    )
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return
    setSending(true)
    try {
      await consultationsApi.messages.send(id, newMessage.trim())
      setNewMessage('')
      const { data } = await consultationsApi.messages.list(id)
      setMessages(data)
    } catch {
      Alert.alert('Error', 'Could not send message.')
    }
    setSending(false)
  }

  if (loading) return <ActivityIndicator style={styles.loader} color="#16a34a" />
  if (!consultation) return <Text style={styles.error}>Consultation not found.</Text>

  const case_  = consultation.emergency_case
  const color  = STATUS_COLORS[consultation.status] || '#64748b'

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Consultation</Text>
      <Text style={styles.subId}>{String(consultation.id).slice(0, 8).toUpperCase()}</Text>

      <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
        <Text style={[styles.statusText, { color }]}>{consultation.status.toUpperCase()}</Text>
      </View>

      {/* Case summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Patient</Text>
        <Row label="Age"    value={case_?.patient?.age || '—'} />
        <Row label="Signs"  value={case_?.danger_signs?.join(', ') || '—'} />
        <Row label="Channel" value={consultation.channel} />
      </View>

      {/* Specialist */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Specialist</Text>
        <Row label="Name"     value={consultation.specialist_name ? `Dr. ${consultation.specialist_name}` : 'Not assigned'} />
        <Row label="Specialty" value={consultation.specialty || '—'} />
      </View>

      {/* Recommendation */}
      {consultation.recommendation ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommendation</Text>
          <Text style={styles.notes}>{consultation.recommendation}</Text>
        </View>
      ) : null}

      {/* Messages */}
      {messages.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Messages</Text>
          {messages.map((m) => (
            <View key={m.id} style={styles.message}>
              <Text style={styles.messageSender}>{m.sender_name || 'System'}</Text>
              <Text style={styles.messageBody}>{m.body}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Send message */}
      {consultation.status !== 'completed' && consultation.status !== 'declined' && (
        <View style={styles.section}>
          <TextInput
            style={styles.messageInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor="#94a3b8"
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, sending && { opacity: 0.6 }]}
            onPress={sendMessage}
            disabled={sending}
          >
            <Text style={styles.sendBtnText}>Send</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Specialist actions */}
      {isSpecialist && consultation.status === 'requested' && !updating && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.primaryBtn]}
            onPress={() => handleStatusUpdate('accepted')}
          >
            <Text style={styles.actionBtnText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.dangerBtn]}
            onPress={() => handleStatusUpdate('declined')}
          >
            <Text style={styles.actionBtnText}>Decline</Text>
          </TouchableOpacity>
        </View>
      )}
      {updating && <ActivityIndicator color="#16a34a" style={{ marginBottom: 24 }} />}
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
  subId:        { fontSize: 13, color: '#94a3b8', marginBottom: 12 },
  statusBadge:  { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 20 },
  statusText:   { fontWeight: '700', fontSize: 13 },
  section:      { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  row:          { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  rowLabel:     { fontSize: 13, color: '#64748b' },
  rowValue:     { fontSize: 13, color: '#0f172a', fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  notes:        { fontSize: 13, color: '#374151', lineHeight: 20 },
  message:      { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 8, marginBottom: 8 },
  messageSender:{ fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 2 },
  messageBody:  { fontSize: 13, color: '#0f172a' },
  messageInput: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    padding: 12, fontSize: 14, color: '#0f172a', minHeight: 80,
    textAlignVertical: 'top', marginBottom: 10,
  },
  sendBtn:      { backgroundColor: '#16a34a', borderRadius: 10, padding: 12, alignItems: 'center' },
  sendBtnText:  { color: '#fff', fontWeight: '700' },
  actions:      { flexDirection: 'row', gap: 12, marginBottom: 32 },
  actionBtn:    { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center' },
  primaryBtn:   { backgroundColor: '#16a34a' },
  dangerBtn:    { backgroundColor: '#dc2626' },
  actionBtnText:{ color: '#fff', fontWeight: '700', fontSize: 14 },
  loader:       { flex: 1, marginTop: 80 },
  error:        { textAlign: 'center', marginTop: 80, color: '#dc2626' },
})
