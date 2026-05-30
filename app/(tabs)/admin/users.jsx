/**
 * app/(tabs)/admin/users.jsx
 * SuperAdmin — manage platform users.
 * List all users, add new user (with facility for relevant roles), delete user.
 */
import { useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, Modal, ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { api } from '../../../src/api/client'
import { UserPlus, Trash2, X, ChevronDown } from 'lucide-react-native'

const ROLES = [
  { value: 'health_worker',  label: 'Health Worker',  needsFacility: true },
  { value: 'facility_admin', label: 'Facility Admin',  needsFacility: true },
  { value: 'specialist',     label: 'Specialist',      needsFacility: false },
  { value: 'driver',         label: 'Driver',          needsFacility: true },
  { value: 'superadmin',     label: 'Superadmin',      needsFacility: false },
]

const ROLE_COLORS = {
  health_worker:  { bg: '#dcfce7', text: '#16a34a' },
  facility_admin: { bg: '#dbeafe', text: '#2563eb' },
  specialist:     { bg: '#ede9fe', text: '#7c3aed' },
  driver:         { bg: '#fef3c7', text: '#d97706' },
  superadmin:     { bg: '#fee2e2', text: '#dc2626' },
}

export default function AdminUsersScreen() {
  const router = useRouter()
  const [users,      setUsers]      = useState([])
  const [facilities, setFacilities] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showModal,  setShowModal]  = useState(false)
  const [showFacilityPicker, setShowFacilityPicker] = useState(false)
  const [saving,     setSaving]     = useState(false)

  // Form
  const [name,       setName]       = useState('')
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [role,       setRole]       = useState('health_worker')
  const [facilityId, setFacilityId] = useState('')

  const selectedRole    = ROLES.find(r => r.value === role)
  const needsFacility   = selectedRole?.needsFacility
  const selectedFacility = facilities.find(f => f.id === facilityId)

  const load = async () => {
    try {
      const [u, f] = await Promise.allSettled([
        api.get('/api/auth/users/'),
        api.get('/api/facilities/'),
      ])
      setUsers(u.value?.data || [])
      setFacilities(f.value?.data || [])
    } catch { }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const resetForm = () => {
    setName(''); setEmail(''); setPassword('')
    setRole('health_worker'); setFacilityId('')
  }

  const addUser = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Required', 'Name, email and password are required.')
      return
    }
    if (needsFacility && !facilityId) {
      Alert.alert('Required', `Please select a facility for the ${selectedRole?.label} role.`)
      return
    }
    setSaving(true)
    try {
      const payload = {
        name:      name.trim(),
        email:     email.trim().toLowerCase(),
        password,
        password2: password,
        role,
      }
      if (facilityId) payload.facility = facilityId
      await api.post('/api/auth/register/', payload)
      setShowModal(false)
      resetForm()
      load()
    } catch (err) {
      const d = err.response?.data
      const msg = d
        ? Object.entries(d).map(([k,v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n')
        : 'Could not create user.'
      Alert.alert('Error', msg)
    }
    setSaving(false)
  }

  const deleteUser = (user) => {
    Alert.alert(
      'Delete User',
      `Remove ${user.name} from the platform? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/auth/users/${user.id}/`)
              load()
            } catch {
              Alert.alert('Error', 'Could not delete user.')
            }
          },
        },
      ]
    )
  }

  const renderItem = ({ item }) => {
    const c = ROLE_COLORS[item.role] || ROLE_COLORS.health_worker
    return (
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase() || 'U'}</Text>
        </View>
        <View style={styles.rowInfo}>
          <Text style={styles.rowName}>{item.name}</Text>
          <Text style={styles.rowEmail}>{item.email}</Text>
          {item.facility_name && <Text style={styles.rowFacility}>📍 {item.facility_name}</Text>}
          <View style={[styles.rolePill, { backgroundColor: c.bg }]}>
            <Text style={[styles.roleText, { color: c.text }]}>{item.role.replace(/_/g, ' ')}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => deleteUser(item)} style={styles.deleteBtn}>
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
        <Text style={styles.title}>Users</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <UserPlus size={18} color="#fff" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#16a34a" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={u => u.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No users found.</Text>}
        />
      )}

      {/* Add User Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modal} keyboardShouldPersistTaps="handled">
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New User</Text>
            <TouchableOpacity onPress={() => { setShowModal(false); resetForm() }}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <MField label="Full Name *"  value={name}     onChange={setName}     placeholder="e.g. Kofi Mensah" />
          <MField label="Email *"      value={email}    onChange={setEmail}    placeholder="kofi@facility.org" keyboard="email-address" />
          <MField label="Password *"   value={password} onChange={setPassword} placeholder="Min 8 characters" secure />

          <Text style={styles.mlabel}>Role</Text>
          <View style={styles.roleGrid}>
            {ROLES.map(r => (
              <TouchableOpacity
                key={r.value}
                style={[styles.roleChip, role === r.value && styles.roleChipActive]}
                onPress={() => { setRole(r.value); setFacilityId('') }}
              >
                <Text style={[styles.roleChipText, role === r.value && styles.roleChipTextActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Facility picker — only for roles that need it */}
          {needsFacility && (
            <>
              <Text style={styles.mlabel}>
                Facility <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.facilityPicker}
                onPress={() => setShowFacilityPicker(true)}
              >
                <Text style={[styles.facilityPickerText, !facilityId && { color: '#94a3b8' }]}>
                  {selectedFacility ? `${selectedFacility.name} — Level ${selectedFacility.level}` : 'Select facility…'}
                </Text>
                <ChevronDown size={16} color="#94a3b8" />
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={addUser}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Create User</Text>}
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </Modal>

      {/* Facility picker modal */}
      <Modal visible={showFacilityPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.pickerModal}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select Facility</Text>
            <TouchableOpacity onPress={() => setShowFacilityPicker(false)}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={facilities}
            keyExtractor={f => f.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.facilityRow, facilityId === item.id && styles.facilityRowActive]}
                onPress={() => { setFacilityId(item.id); setShowFacilityPicker(false) }}
              >
                <View>
                  <Text style={styles.facilityName}>{item.name}</Text>
                  <Text style={styles.facilitySub}>Level {item.level} · {item.district || item.region || '—'}</Text>
                </View>
                {facilityId === item.id && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.empty}>No facilities found.</Text>}
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
  container:          { flex: 1, backgroundColor: '#f8fafc' },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 56, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  backText:           { color: '#16a34a', fontWeight: '600', fontSize: 14 },
  title:              { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  addBtn:             { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#16a34a', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnText:         { color: '#fff', fontWeight: '700', fontSize: 13 },
  list:               { padding: 16, gap: 10 },
  row:                { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:             { width: 40, height: 40, borderRadius: 20, backgroundColor: '#16a34a', justifyContent: 'center', alignItems: 'center' },
  avatarText:         { color: '#fff', fontWeight: '700', fontSize: 16 },
  rowInfo:            { flex: 1 },
  rowName:            { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  rowEmail:           { fontSize: 12, color: '#64748b', marginTop: 1 },
  rowFacility:        { fontSize: 11, color: '#64748b', marginTop: 1 },
  rolePill:           { alignSelf: 'flex-start', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, marginTop: 4 },
  roleText:           { fontSize: 10, fontWeight: '700' },
  deleteBtn:          { padding: 8 },
  empty:              { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
  modal:              { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  modalHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 24 },
  modalTitle:         { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  mlabel:             { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 14, marginBottom: 6 },
  required:           { color: '#dc2626' },
  minput:             { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0f172a', backgroundColor: '#fff' },
  roleGrid:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  roleChip:           { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  roleChipActive:     { borderColor: '#16a34a', backgroundColor: '#dcfce7' },
  roleChipText:       { fontSize: 13, color: '#64748b', fontWeight: '500' },
  roleChipTextActive: { color: '#16a34a', fontWeight: '700' },
  facilityPicker:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff' },
  facilityPickerText: { fontSize: 15, color: '#0f172a', flex: 1 },
  saveBtn:            { backgroundColor: '#16a34a', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  saveBtnText:        { color: '#fff', fontWeight: '700', fontSize: 15 },
  pickerModal:        { flex: 1, backgroundColor: '#f8fafc' },
  pickerHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  pickerTitle:        { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  facilityRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#fff' },
  facilityRowActive:  { backgroundColor: '#f0fdf4' },
  facilityName:       { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  facilitySub:        { fontSize: 12, color: '#64748b', marginTop: 2 },
  checkmark:          { fontSize: 18, color: '#16a34a', fontWeight: '700' },
})
