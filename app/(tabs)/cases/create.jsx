/**
 * app/(tabs)/cases/create.jsx
 * Create Emergency Case — multi-step form for health workers.
 * Fixed: proper flat payload matching backend serializer fields exactly.
 */
import { useState } from 'react'
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { api } from '../../../src/api/client'

const DANGER_SIGNS = [
  { code: 'PPH',                  label: 'Postpartum Haemorrhage',  color: '#dc2626' },
  { code: 'APH',                  label: 'Antepartum Haemorrhage',  color: '#dc2626' },
  { code: 'RUPTURED_UTERUS',      label: 'Ruptured Uterus',         color: '#dc2626' },
  { code: 'ECLAMPSIA',            label: 'Eclampsia',               color: '#ea580c' },
  { code: 'SEVERE_PRE_ECLAMPSIA', label: 'Severe Pre-Eclampsia',    color: '#ea580c' },
  { code: 'OBSTRUCTED_LABOUR',    label: 'Obstructed Labour',       color: '#ea580c' },
  { code: 'CORD_PROLAPSE',        label: 'Cord Prolapse',           color: '#dc2626' },
  { code: 'PUERPERAL_SEPSIS',     label: 'Puerperal Sepsis',        color: '#d97706' },
  { code: 'CHORIOAMNIONITIS',     label: 'Chorioamnionitis',        color: '#d97706' },
  { code: 'NEONATAL_DISTRESS',    label: 'Neonatal Distress',       color: '#ea580c' },
  { code: 'PRETERM_LABOUR',       label: 'Preterm Labour',          color: '#d97706' },
  { code: 'NEONATAL_SEPSIS',      label: 'Neonatal Sepsis',         color: '#dc2626' },
  { code: 'SEVERE_ANAEMIA',       label: 'Severe Anaemia',          color: '#d97706' },
  { code: 'MALPRESENTATION',      label: 'Malpresentation',         color: '#d97706' },
]

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown']
const MEMBRANES    = ['intact', 'ruptured', 'unknown']
const TOTAL_STEPS  = 3

export default function CreateCaseScreen() {
  const router  = useRouter()
  const [step,    setStep]    = useState(1)
  const [loading, setLoading] = useState(false)

  // Step 1: Patient
  const [patientName,  setPatientName]  = useState('')
  const [patientAge,   setPatientAge]   = useState('')
  const [patientPhone, setPatientPhone] = useState('')
  const [hospitalId,   setHospitalId]   = useState('')
  const [district,     setDistrict]     = useState('')
  const [bloodGroup,   setBloodGroup]   = useState('unknown')
  const [ancVisits,    setAncVisits]    = useState('0')

  // Step 2: Clinical
  const [complaint,   setComplaint]   = useState('')
  const [dangerSigns, setDangerSigns] = useState([])
  const [gestAge,     setGestAge]     = useState('')
  const [gravida,     setGravida]     = useState('')
  const [parity,      setParity]      = useState('')
  const [membranes,   setMembranes]   = useState('unknown')

  // Step 3: Vitals
  const [systolic,  setSystolic]  = useState('')
  const [diastolic, setDiastolic] = useState('')
  const [heartRate, setHeartRate] = useState('')
  const [respRate,  setRespRate]  = useState('')
  const [temp,      setTemp]      = useState('')
  const [spo2,      setSpo2]      = useState('')
  const [fhr,       setFhr]       = useState('')

  const toggleSign = (code) =>
    setDangerSigns(prev =>
      prev.includes(code) ? prev.filter(s => s !== code) : [...prev, code]
    )

  const validateStep = () => {
    if (step === 1 && (!patientAge || isNaN(Number(patientAge)))) {
      Alert.alert('Required', 'Please enter a valid patient age.')
      return false
    }
    if (step === 2 && !complaint.trim()) {
      Alert.alert('Required', 'Please enter the presenting complaint.')
      return false
    }
    return true
  }

  const nextStep = () => { if (validateStep()) setStep(s => Math.min(s + 1, TOTAL_STEPS)) }
  const prevStep = () => setStep(s => Math.max(s - 1, 1))

  const submit = async () => {
    if (!validateStep()) return
    setLoading(true)

    // Build vital_signs — only include fields that have values
    const vital_signs = {}
    if (systolic)  vital_signs.systolic_bp       = Number(systolic)
    if (diastolic) vital_signs.diastolic_bp      = Number(diastolic)
    if (heartRate) vital_signs.heart_rate        = Number(heartRate)
    if (respRate)  vital_signs.respiratory_rate  = Number(respRate)
    if (temp)      vital_signs.temperature       = Number(temp)
    if (spo2)      vital_signs.spo2              = Number(spo2)

    // Flat payload — matches EmergencyCaseCreateSerializer exactly
    const payload = {
      patient_name:          patientName.trim(),
      patient_age:           Number(patientAge),
      patient_phone_number:  patientPhone.trim(),
      hospital_id:           hospitalId.trim(),
      patient_district:      district.trim(),
      patient_blood_group:   bloodGroup,
      patient_anc_visits:    Number(ancVisits) || 0,
      presenting_complaint:  complaint.trim(),
      danger_signs:          dangerSigns,
      gestational_age_weeks: gestAge  ? Number(gestAge)  : null,
      gravida:               gravida  ? Number(gravida)  : null,
      parity:                parity   ? Number(parity)   : null,
      membranes_status:      membranes,
      fetal_heart_rate:      fhr      ? Number(fhr)      : null,
      vital_signs,
    }

    try {
      const { data } = await api.post('/api/cases/', payload)
      Alert.alert(
        'Case Created ✓',
        'Would you like to find a referral facility now?',
        [
          { text: 'Later',       onPress: () => router.replace('/cases') },
          { text: 'Find Facility', onPress: () => router.push(`/cases/suggest?caseId=${data.id}`) },
        ]
      )
    } catch (err) {
      // Parse error — handles both JSON and HTML responses
      let msg = 'Could not create case. Please try again.'
      if (err.response) {
        const ct = err.response.headers?.['content-type'] || ''
        if (ct.includes('application/json')) {
          const d = err.response.data
          // Flatten DRF validation errors into readable string
          if (typeof d === 'object') {
            msg = Object.entries(d)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
              .join('\n')
          } else {
            msg = String(d)
          }
        } else {
          // HTML error — likely 404 or server misconfiguration
          msg = `Server error (${err.response.status}). Check that your account is linked to a facility.`
        }
      }
      Alert.alert('Error', msg)
    }
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Emergency Case</Text>

        {/* Progress */}
        <View style={styles.progressRow}>
          {[1,2,3].map(s => (
            <View key={s} style={[styles.progressDot, step >= s && styles.progressDotActive]} />
          ))}
        </View>
        <Text style={styles.stepLabel}>
          Step {step} of {TOTAL_STEPS} —{' '}
          {step === 1 ? 'Patient Details' : step === 2 ? 'Clinical Presentation' : 'Vital Signs'}
        </Text>

        {/* STEP 1 */}
        {step === 1 && (
          <View style={styles.form}>
            <Field label="Full Name (optional)" value={patientName} onChange={setPatientName} placeholder="e.g. Akosua Mensah" />
            <Field label="Age *" value={patientAge} onChange={setPatientAge} placeholder="e.g. 28" keyboard="numeric" />
            <Field label="Phone Number" value={patientPhone} onChange={setPatientPhone} placeholder="+233..." keyboard="phone-pad" />
            <Field label="Hospital ID / Folder No." value={hospitalId} onChange={setHospitalId} placeholder="Optional" />
            <Field label="District" value={district} onChange={setDistrict} placeholder="e.g. Tamale Central" />
            <Field label="ANC Visits" value={ancVisits} onChange={setAncVisits} placeholder="0" keyboard="numeric" />
            <Text style={styles.label}>Blood Group</Text>
            <View style={styles.chipRow}>
              {BLOOD_GROUPS.map(bg => (
                <TouchableOpacity
                  key={bg}
                  style={[styles.chip, bloodGroup === bg && styles.chipActive]}
                  onPress={() => setBloodGroup(bg)}
                >
                  <Text style={[styles.chipText, bloodGroup === bg && styles.chipTextActive]}>{bg}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <View style={styles.form}>
            <Text style={styles.label}>Presenting Complaint *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={complaint}
              onChangeText={setComplaint}
              placeholder="Describe the chief complaint..."
              placeholderTextColor="#94a3b8"
              multiline numberOfLines={4} textAlignVertical="top"
            />
            <Field label="Gestational Age (weeks)" value={gestAge} onChange={setGestAge} placeholder="e.g. 32" keyboard="numeric" />
            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}><Field label="Gravida" value={gravida} onChange={setGravida} placeholder="e.g. 3" keyboard="numeric" /></View>
              <View style={{ flex: 1 }}><Field label="Parity"  value={parity}  onChange={setParity}  placeholder="e.g. 2" keyboard="numeric" /></View>
            </View>
            <Text style={styles.label}>Membranes Status</Text>
            <View style={styles.chipRow}>
              {MEMBRANES.map(m => (
                <TouchableOpacity key={m} style={[styles.chip, membranes === m && styles.chipActive]} onPress={() => setMembranes(m)}>
                  <Text style={[styles.chipText, membranes === m && styles.chipTextActive]}>{m.charAt(0).toUpperCase() + m.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Danger Signs</Text>
            <Text style={styles.hint}>Select all that apply</Text>
            <View style={styles.signsGrid}>
              {DANGER_SIGNS.map(sign => {
                const selected = dangerSigns.includes(sign.code)
                return (
                  <TouchableOpacity
                    key={sign.code}
                    style={[styles.signChip, selected && { backgroundColor: sign.color, borderColor: sign.color }]}
                    onPress={() => toggleSign(sign.code)}
                  >
                    <Text style={[styles.signChipText, selected && { color: '#fff' }]}>{sign.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <View style={styles.form}>
            <Text style={styles.hint}>All vital sign fields are optional.</Text>
            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}><Field label="Systolic BP"  value={systolic}  onChange={setSystolic}  keyboard="numeric" placeholder="120" /></View>
              <View style={{ flex: 1 }}><Field label="Diastolic BP" value={diastolic} onChange={setDiastolic} keyboard="numeric" placeholder="80"  /></View>
            </View>
            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}><Field label="Heart Rate (bpm)"  value={heartRate} onChange={setHeartRate} keyboard="numeric" placeholder="88" /></View>
              <View style={{ flex: 1 }}><Field label="Resp Rate (/min)"  value={respRate}  onChange={setRespRate}  keyboard="numeric" placeholder="18" /></View>
            </View>
            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}><Field label="Temperature (°C)" value={temp} onChange={setTemp} keyboard="decimal-pad" placeholder="37.2" /></View>
              <View style={{ flex: 1 }}><Field label="SpO2 (%)"         value={spo2} onChange={setSpo2} keyboard="numeric"      placeholder="98"   /></View>
            </View>
            <Field label="Fetal Heart Rate (bpm)" value={fhr} onChange={setFhr} keyboard="numeric" placeholder="140" />
            {dangerSigns.length > 0 && (
              <View style={styles.summaryBox}>
                <Text style={styles.summaryTitle}>Selected Danger Signs</Text>
                {dangerSigns.map(s => (
                  <Text key={s} style={styles.summarySign}>
                    ⚠ {DANGER_SIGNS.find(d => d.code === s)?.label || s}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Nav buttons */}
        <View style={styles.navRow}>
          {step > 1 && (
            <TouchableOpacity style={styles.backBtn} onPress={prevStep}>
              <Text style={styles.backBtnText}>← Previous</Text>
            </TouchableOpacity>
          )}
          {step < TOTAL_STEPS ? (
            <TouchableOpacity style={styles.nextBtn} onPress={nextStep}>
              <Text style={styles.nextBtnText}>Next →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.nextBtn, loading && { opacity: 0.6 }]} onPress={submit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.nextBtnText}>Submit Case</Text>}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function Field({ label, value, onChange, placeholder, keyboard }) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboard || 'default'}
      />
    </>
  )
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  back:             { marginTop: 48, marginBottom: 8 },
  backText:         { color: '#16a34a', fontWeight: '600', fontSize: 15 },
  title:            { fontSize: 22, fontWeight: '700', color: '#0f172a', marginTop: 8, marginBottom: 16 },
  progressRow:      { flexDirection: 'row', gap: 8, marginBottom: 8 },
  progressDot:      { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0' },
  progressDotActive:{ backgroundColor: '#16a34a' },
  stepLabel:        { fontSize: 12, color: '#64748b', marginBottom: 20, fontWeight: '600' },
  form:             { gap: 4 },
  label:            { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 12, marginBottom: 6 },
  hint:             { fontSize: 12, color: '#94a3b8', marginBottom: 8 },
  input:            { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0f172a', backgroundColor: '#fff', marginBottom: 4 },
  textArea:         { minHeight: 100, textAlignVertical: 'top' },
  twoCol:           { flexDirection: 'row', gap: 12 },
  chipRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip:             { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fff' },
  chipActive:       { borderColor: '#16a34a', backgroundColor: '#dcfce7' },
  chipText:         { fontSize: 13, color: '#64748b', fontWeight: '500' },
  chipTextActive:   { color: '#16a34a', fontWeight: '700' },
  signsGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  signChip:         { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#fff' },
  signChipText:     { fontSize: 12, color: '#374151', fontWeight: '500' },
  summaryBox:       { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 16, borderLeftWidth: 3, borderLeftColor: '#dc2626' },
  summaryTitle:     { fontSize: 13, fontWeight: '700', color: '#64748b', marginBottom: 8 },
  summarySign:      { fontSize: 13, color: '#dc2626', marginBottom: 4 },
  navRow:           { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 48 },
  backBtn:          { flex: 1, borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, alignItems: 'center', backgroundColor: '#fff' },
  backBtnText:      { color: '#374151', fontWeight: '600', fontSize: 15 },
  nextBtn:          { flex: 2, backgroundColor: '#16a34a', borderRadius: 12, padding: 14, alignItems: 'center' },
  nextBtnText:      { color: '#fff', fontWeight: '700', fontSize: 15 },
})
