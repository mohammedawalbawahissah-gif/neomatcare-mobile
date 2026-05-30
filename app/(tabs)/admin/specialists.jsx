/**
 * app/(tabs)/admin/specialists.jsx
 * SuperAdmin — manage specialist profiles.
 * All fields from SpecialistProfile model:
 * professional_pin, specialty, qualification, years_experience,
 * specialist_phone, specialist_email, whatsapp_number,
 * emergency_contact, bio, is_available, facility
 */
import { useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, Modal, ScrollView, Switch,
} from 'react-native'
import { useRouter } from 'expo-router'
import { api } from '../../../src/api/client'
import { Plus, Trash2, X, ChevronDown } from 'lucide-react-native'

const SPECIALTIES = [
  { value: 'obstetrics',         label: 'Obstetrics' },
  { value: 'neonatology',        label: 'Neonatology' },
  { value: 'anaesthesiology',    label: 'Anaesthesiology' },
  { value: 'general_surgery',    label: 'General Surgery' },
  { value: 'internal_medicine',  label: 'Internal Medicine' },
  { value: 'emergency_medicine', label: 'Emergency Medicine' },
  { value: 'haematology',        label: 'Haematology' },
  { value: 'other',              label: 'Other' },
]

const SPECIALTY_COLORS = {
  obstetrics:         '#ec4899',
  neonatology:        '#7c3aed',
  anaesthesiology:    '#2563eb',
  general_surgery:    '#dc2626',
  internal_medicine:  '#d97706',
  emergency_medicine: '#ea580c',
  haematology:        '#059669',
  other:              '#64748b',
}

export default function AdminSpecialistsScreen() {
  const router = useRouter()
  const [specialists, setSpecialists] = useState([])
  const [facilities,  setFacilities]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showModal,   setShowModal]   = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [step,        setStep]        = useState(1) // 1=account, 2=profile
  const [newUserId,   setNewUserId]   = useState(null)

  const [showFacilityPicker, setShowFacilityPicker] = useState(false)

  // Step 1 — User account
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')

  // Step 2 — Specialist profile (all SpecialistProfile fields)
  const [specialty,        setSpecialty]        = useState('obstetrics')
  const [qualification,    setQualification]    = useState('')
  const [yearsExp,         setYearsExp]         = useState('')
  const [professionalPin,  setProfessionalPin]  = useState('')
  const [specialistPhone,  setSpecialistPhone]  = useState('')
  const [specialistEmail,  setSpecialistEmail]  = useState('')
  const [whatsappNumber,   setWhatsappNumber]   = useState('')
  const [emergencyContact, setEmergencyContact] = useState('')
  const [bio,              setBio]              = useState('')
  const [isAvailable,      setIsAvailable]      = useState(true)
  const [facilityId,       setFacilityId]       = useState('')

  const selectedFacility = facilities.find(f => f.id === facilityId)

  const load = async () => {
    try {
      const [s, f] = await Promise.allSettled([
        api.get('/api/consultations/specialists/'),
        api.get('/api/facilities/'),
      ])
      setSpecialists(s.value?.data || [])
      setFacilities(f.value?.data  || [])
    } catch { }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const resetForm = () => {
    setStep(1); setNewUserId(null)
    setName(''); setEmail(''); setPassword('')
    setSpecialty('obstetrics'); setQualification(''); setYearsExp('')
    setProfessionalPin(''); setSpecialistPhone(''); setSpecialistEmail('')
    setWhatsappNumber(''); setEmergencyContact(''); setBio('')
    setIsAvailable(true); setFacilityId('')
  }

  // Step 1 — create the user account
  const createAccount = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Required', 'Name, email and password are required.')
      return
    }
    setSaving(true)
    try {
      const { data } = await api.post('/api/auth/register/', {
        name:      name.trim(),
        email:     email.trim().toLowerCase(),
        password,
        password2: password,
        role:      'specialist',
      })
      setNewUserId(data.user?.id)
      setStep(2)
    } catch (err) {
      const d = err.response?.data
      const msg = d
        ? Object.entries(d).map(([k,v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n')
        : 'Could not create account.'
      Alert.alert('Error', msg)
    }
    setSaving(false)
  }

  // Step 2 — create the specialist profile
  const createProfile = async () => {
    if (!newUserId) return
    setSaving(true)
    try {
      const payload = {
        user:             newUserId,
        specialty,
        qualification:    qualification.trim(),
        years_experience: yearsExp ? Number(yearsExp) : 0,
        specialist_phone: specialistPhone.trim(),
        specialist_email: specialistEmail.trim(),
        whatsapp_number:  whatsappNumber.trim(),
        emergency_contact:emergencyContact.trim(),
        bio:              bio.trim(),
        is_available:     isAvailable,
      }
      if (professionalPin.trim()) payload.professional_pin = professionalPin.trim()
      if (facilityId)             payload.facility         = facilityId

      await api.post('/api/consultations/specialists/', payload)
      setShowModal(false)
      resetForm()
      load()
    } catch (err) {
      const d = err.response?.data
      const msg = d ? JSON.stringify(d) : 'Could not create specialist profile.'
      Alert.alert('Error', msg)
    }
    setSaving(false)
  }

  const deleteSpecialist = (specialist) => {
    Alert.alert(
      'Remove Specialist',
      `Remove Dr. ${specialist.user_name} from the platform?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/consultations/specialists/${specialist.id}/`)
              load()
            } catch {
              Alert.alert('Error', 'Could not remove specialist.')
            }
          },
        },
      ]
    )
  }

  const renderItem = ({ item }) => {
    const color = SPECIALTY_COLORS[item.specialty] || '#64748b'
    return (
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: color }]}>
          <Text style={styles.avatarText}>{item.user_name?.[0]?.toUpperCase() || 'S'}</Text>
        </View>
        <View style={styles.rowInfo}>
          <Text style={styles.rowName}>Dr. {item.user_name}</Text>
          <Text style={styles.rowSub}>{item.specialty_display || item.specialty}</Text>
          {item.qualification    && <Text style={styles.rowSub}>{item.qualification}</Text>}
          {item.specialist_phone && <Text style={styles.rowSub}>📞 {item.specialist_phone}</Text>}
          {item.whatsapp_number  && <Text style={styles.rowSub}>💬 {item.whatsapp_number}</Text>}
          <View style={[styles.availPill, { backgroundColor: item.is_available ? '#dcfce7' : '#fee2e2' }]}>
            <Text style={[styles.availText, { color: item.is_available ? '#16a34a' : '#dc2626' }]}>
              {item.is_available ? 'Available' : 'Unavailable'}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => deleteSpecialist(item)} style={styles.deleteBtn}>
          <Trash2 size={18} color="#dc2626" />
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Admin</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Specialists</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Plus size={18} color="#fff" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#16a34a" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={specialists}
          keyExtractor={s => s.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No specialists registered.</Text>}
        />
      )}

      {/* Add Specialist Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modal} keyboardShouldPersistTaps="handled">
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {step === 1 ? 'Step 1 of 2 — Account' : 'Step 2 of 2 — Profile'}
            </Text>
            <TouchableOpacity onPress={() => { setShowModal(false); resetForm() }}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Progress bar */}
          <View style={styles.progressRow}>
            <View style={[styles.progressDot, styles.progressActive]} />
            <View style={[styles.progressDot, step === 2 && styles.progressActive]} />
          </View>

          {/* ── STEP 1: Account ── */}
          {step === 1 && (
            <>
              <MField label="Full Name *"  value={name}     onChange={setName}     placeholder="e.g. Dr. Amina Sule" />
              <MField label="Email *"      value={email}    onChange={setEmail}    placeholder="amina@hospital.org" keyboard="email-address" />
              <MField label="Password *"   value={password} onChange={setPassword} placeholder="Min 8 characters" secure />
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={createAccount}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>Next: Specialist Profile →</Text>}
              </TouchableOpacity>
            </>
          )}

          {/* ── STEP 2: Profile ── */}
          {step === 2 && (
            <>
              {/* Specialty */}
              <Text style={styles.mlabel}>Specialty *</Text>
              <View style={styles.chipGrid}>
                {SPECIALTIES.map(s => (
                  <TouchableOpacity
                    key={s.value}
                    style={[styles.chip, specialty === s.value && styles.chipActive]}
                    onPress={() => setSpecialty(s.value)}
                  >
                    <Text style={[styles.chipText, specialty === s.value && styles.chipTextActive]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <MField label="Qualification"       value={qualification}    onChange={setQualification}    placeholder="e.g. MBChB, FWACS" />
              <MField label="Years of Experience" value={yearsExp}         onChange={setYearsExp}         placeholder="e.g. 8" keyboard="numeric" />
              <MField label="Professional PIN"    value={professionalPin}  onChange={setProfessionalPin}  placeholder="e.g. MDC-12345" />
              <MField label="Phone Number"        value={specialistPhone}  onChange={setSpecialistPhone}  placeholder="+233..." keyboard="phone-pad" />
              <MField label="Professional Email"  value={specialistEmail}  onChange={setSpecialistEmail}  placeholder="work@hospital.org" keyboard="email-address" />
              <MField label="WhatsApp Number"     value={whatsappNumber}   onChange={setWhatsappNumber}   placeholder="+233..." keyboard="phone-pad" />
              <MField label="Emergency Contact"   value={emergencyContact} onChange={setEmergencyContact} placeholder="+233..." keyboard="phone-pad" />

              {/* Bio */}
              <Text style={styles.mlabel}>Bio</Text>
              <TextInput
                style={[styles.minput, { minHeight: 100, textAlignVertical: 'top' }]}
                value={bio}
                onChangeText={setBio}
                placeholder="Brief professional background..."
                placeholderTextColor="#94a3b8"
                multiline
              />

              {/* Facility */}
              <Text style={styles.mlabel}>Facility (optional)</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setShowFacilityPicker(true)}>
                <Text style={[styles.pickerText, !facilityId && { color: '#94a3b8' }]}>
                  {selectedFacility
                    ? `${selectedFacility.name} — Level ${selectedFacility.level}`
                    : 'Select facility…'}
                </Text>
                <ChevronDown size={16} color="#94a3b8" />
              </TouchableOpacity>

              {/* Available toggle */}
              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Available for Consultations</Text>
                  <Text style={styles.toggleSub}>Specialist can receive new requests</Text>
                </View>
                <Switch
                  value={isAvailable}
                  onValueChange={setIsAvailable}
                  trackColor={{ true: '#16a34a', false: '#e2e8f0' }}
                  thumbColor="#fff"
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={createProfile}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>Add Specialist</Text>}
              </TouchableOpacity>
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </Modal>

      {/* Facility Picker */}
      <Modal visible={showFacilityPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.pickerModal}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select Facility</Text>
            <TouchableOpacity onPress={() => setShowFacilityPicker(false)}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={[{ id: '', name: 'No facility', level: '', district: '' }, ...facilities]}
            keyExtractor={f => f.id || 'none'}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.pickRow, facilityId === item.id && styles.pickRowActive]}
                onPress={() => { setFacilityId(item.id); setShowFacilityPicker(false) }}
              >
                <View>
                  <Text style={styles.pickName}>{item.name}</Text>
                  {item.level
                    ? <Text style={styles.pickSub}>Level {item.level} · {item.district || '—'}</Text>
                    : null}
                </View>
                {facilityId === item.id && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  )
}

function MField({ label, value, onChange, placeholder, keyboard, secure }) {
  return (
    <>
      <Text style={styles.mlabel}>{label}</Text>
      <TextInput
        style={styles.minput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboard || 'default'}
        secureTextEntry={secure}
        autoCapitalize="none"
      />
    </>
  )
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#f8fafc' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 56, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  backText:       { color: '#16a34a', fontWeight: '600', fontSize: 14 },
  title:          { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  addBtn:         { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#16a34a', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnText:     { color: '#fff', fontWeight: '700', fontSize: 13 },
  list:           { padding: 16, gap: 10 },
  row:            { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:         { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText:     { color: '#fff', fontWeight: '700', fontSize: 18 },
  rowInfo:        { flex: 1 },
  rowName:        { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  rowSub:         { fontSize: 12, color: '#64748b', marginTop: 2 },
  availPill:      { alignSelf: 'flex-start', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, marginTop: 4 },
  availText:      { fontSize: 10, fontWeight: '700' },
  deleteBtn:      { padding: 8 },
  empty:          { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
  modal:          { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 16 },
  modalTitle:     { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  progressRow:    { flexDirection: 'row', gap: 8, marginBottom: 20 },
  progressDot:    { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0' },
  progressActive: { backgroundColor: '#16a34a' },
  mlabel:         { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 14, marginBottom: 6 },
  minput:         { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0f172a', backgroundColor: '#fff' },
  chipGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:           { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  chipActive:     { borderColor: '#16a34a', backgroundColor: '#dcfce7' },
  chipText:       { fontSize: 13, color: '#64748b', fontWeight: '500' },
  chipTextActive: { color: '#16a34a', fontWeight: '700' },
  picker:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff' },
  pickerText:     { fontSize: 15, color: '#0f172a', flex: 1 },
  toggleRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 14, marginTop: 14 },
  toggleLabel:    { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  toggleSub:      { fontSize: 12, color: '#64748b', marginTop: 2 },
  saveBtn:        { backgroundColor: '#16a34a', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  saveBtnText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
  pickerModal:    { flex: 1, backgroundColor: '#f8fafc' },
  pickerHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  pickerTitle:    { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  pickRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#fff' },
  pickRowActive:  { backgroundColor: '#f0fdf4' },
  pickName:       { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  pickSub:        { fontSize: 12, color: '#64748b', marginTop: 2 },
  checkmark:      { fontSize: 18, color: '#16a34a', fontWeight: '700' },
})
