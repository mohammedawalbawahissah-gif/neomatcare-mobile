/**
 * app/(tabs)/admin/vehicles.jsx
 * SuperAdmin — manage vehicle fleet.
 * All fields from Vehicle model: registration, vehicle_type, make, model,
 * year, status, driver, facility, notes.
 */
import { useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, Modal, ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { api } from '../../../src/api/client'
import { Plus, Trash2, X, ChevronDown } from 'lucide-react-native'

const VEHICLE_TYPES = [
  { value: 'ambulance',         label: 'Ambulance',         icon: '🚑' },
  { value: 'motorbike',         label: 'Motorbike',         icon: '🏍️' },
  { value: 'community_vehicle', label: 'Community Vehicle', icon: '🚗' },
  { value: 'boat',              label: 'Boat',              icon: '⛵' },
  { value: 'helicopter',        label: 'Helicopter',        icon: '🚁' },
  { value: 'saloon',            label: 'Saloon',            icon: '🚘' },
  { value: 'pickup',            label: 'Pickup',            icon: '🛻' },
  { value: 'other',             label: 'Other',             icon: '🚐' },
]

const STATUSES = [
  { value: 'available',    label: 'Available',    bg: '#dcfce7', text: '#16a34a' },
  { value: 'dispatched',   label: 'Dispatched',   bg: '#dbeafe', text: '#2563eb' },
  { value: 'maintenance',  label: 'Maintenance',  bg: '#fee2e2', text: '#dc2626' },
  { value: 'offline',      label: 'Offline',      bg: '#f1f5f9', text: '#64748b' },
]

export default function AdminVehiclesScreen() {
  const router = useRouter()
  const [vehicles,   setVehicles]   = useState([])
  const [drivers,    setDrivers]    = useState([])
  const [facilities, setFacilities] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showModal,  setShowModal]  = useState(false)
  const [saving,     setSaving]     = useState(false)

  const [showDriverPicker,   setShowDriverPicker]   = useState(false)
  const [showFacilityPicker, setShowFacilityPicker] = useState(false)

  // Form — all Vehicle model fields
  const [registration, setRegistration] = useState('')
  const [vehicleType,  setVehicleType]  = useState('ambulance')
  const [make,         setMake]         = useState('')
  const [model,        setModel]        = useState('')
  const [year,         setYear]         = useState('')
  const [status,       setStatus]       = useState('available')
  const [driverId,     setDriverId]     = useState('')
  const [facilityId,   setFacilityId]   = useState('')
  const [notes,        setNotes]        = useState('')

  const selectedDriver   = drivers.find(d => d.id === driverId)
  const selectedFacility = facilities.find(f => f.id === facilityId)

  const load = async () => {
    try {
      const [v, u, f] = await Promise.allSettled([
        api.get('/api/vehicles/'),
        api.get('/api/auth/users/', { params: { role: 'driver' } }),
        api.get('/api/facilities/'),
      ])
      setVehicles(v.value?.data  || [])
      setDrivers(u.value?.data   || [])
      setFacilities(f.value?.data || [])
    } catch { }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const resetForm = () => {
    setRegistration(''); setVehicleType('ambulance'); setMake('')
    setModel(''); setYear(''); setStatus('available')
    setDriverId(''); setFacilityId(''); setNotes('')
  }

  const addVehicle = async () => {
    if (!registration.trim()) {
      Alert.alert('Required', 'Registration number is required.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        registration:  registration.trim().toUpperCase(),
        vehicle_type:  vehicleType,
        make:          make.trim(),
        model:         model.trim(),
        year:          year ? Number(year) : null,
        status,
        notes:         notes.trim(),
      }
      if (driverId)   payload.driver   = driverId
      if (facilityId) payload.facility = facilityId

      await api.post('/api/vehicles/', payload)
      setShowModal(false)
      resetForm()
      load()
    } catch (err) {
      const d = err.response?.data
      const msg = d
        ? Object.entries(d).map(([k,v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n')
        : 'Could not add vehicle.'
      Alert.alert('Error', msg)
    }
    setSaving(false)
  }

  const deleteVehicle = (vehicle) => {
    Alert.alert(
      'Remove Vehicle',
      `Remove "${vehicle.registration}" from the fleet?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/vehicles/${vehicle.id}/`)
              load()
            } catch {
              Alert.alert('Error', 'Could not remove vehicle.')
            }
          },
        },
      ]
    )
  }

  const renderItem = ({ item }) => {
    const typeObj   = VEHICLE_TYPES.find(t => t.value === item.vehicle_type)
    const statusObj = STATUSES.find(s => s.value === item.status) || STATUSES[3]
    return (
      <View style={styles.row}>
        <Text style={styles.typeIcon}>{typeObj?.icon || '🚗'}</Text>
        <View style={styles.rowInfo}>
          <Text style={styles.rowReg}>{item.registration}</Text>
          <Text style={styles.rowName}>
            {[item.make, item.model, item.year].filter(Boolean).join(' ') || typeObj?.label}
          </Text>
          {item.facility_name && <Text style={styles.rowSub}>📍 {item.facility_name}</Text>}
          {item.driver_name   && <Text style={styles.rowSub}>👤 {item.driver_name}</Text>}
        </View>
        <View style={styles.rowRight}>
          <View style={[styles.statusPill, { backgroundColor: statusObj.bg }]}>
            <Text style={[styles.statusText, { color: statusObj.text }]}>{item.status}</Text>
          </View>
          <TouchableOpacity onPress={() => deleteVehicle(item)} style={styles.deleteBtn}>
            <Trash2 size={18} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Admin</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Vehicles</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Plus size={18} color="#fff" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#16a34a" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={v => v.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No vehicles in fleet.</Text>}
        />
      )}

      {/* Add Vehicle Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modal} keyboardShouldPersistTaps="handled">
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Vehicle</Text>
            <TouchableOpacity onPress={() => { setShowModal(false); resetForm() }}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <MField label="Registration Number *" value={registration} onChange={setRegistration} placeholder="e.g. GR-1234-21" />
          <MField label="Make"  value={make}  onChange={setMake}  placeholder="e.g. Toyota" />
          <MField label="Model" value={model} onChange={setModel} placeholder="e.g. Land Cruiser" />
          <MField label="Year"  value={year}  onChange={setYear}  placeholder="e.g. 2022" keyboard="numeric" />

          <Text style={styles.mlabel}>Vehicle Type</Text>
          <View style={styles.chipGrid}>
            {VEHICLE_TYPES.map(t => (
              <TouchableOpacity
                key={t.value}
                style={[styles.chip, vehicleType === t.value && styles.chipActive]}
                onPress={() => setVehicleType(t.value)}
              >
                <Text style={styles.chipIcon}>{t.icon}</Text>
                <Text style={[styles.chipText, vehicleType === t.value && styles.chipTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.mlabel}>Status</Text>
          <View style={styles.chipRow}>
            {STATUSES.map(s => (
              <TouchableOpacity
                key={s.value}
                style={[styles.chip, status === s.value && { borderColor: s.text, backgroundColor: s.bg }]}
                onPress={() => setStatus(s.value)}
              >
                <Text style={[styles.chipText, status === s.value && { color: s.text, fontWeight: '700' }]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.mlabel}>Assign Driver (optional)</Text>
          <TouchableOpacity style={styles.picker} onPress={() => setShowDriverPicker(true)}>
            <Text style={[styles.pickerText, !driverId && { color: '#94a3b8' }]}>
              {selectedDriver ? selectedDriver.name : 'Select driver…'}
            </Text>
            <ChevronDown size={16} color="#94a3b8" />
          </TouchableOpacity>

          <Text style={styles.mlabel}>Assign Facility (optional)</Text>
          <TouchableOpacity style={styles.picker} onPress={() => setShowFacilityPicker(true)}>
            <Text style={[styles.pickerText, !facilityId && { color: '#94a3b8' }]}>
              {selectedFacility
                ? `${selectedFacility.name} — Level ${selectedFacility.level}`
                : 'Select facility…'}
            </Text>
            <ChevronDown size={16} color="#94a3b8" />
          </TouchableOpacity>

          <Text style={styles.mlabel}>Notes</Text>
          <TextInput
            style={[styles.minput, { minHeight: 80, textAlignVertical: 'top' }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional notes..."
            placeholderTextColor="#94a3b8"
            multiline
          />

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={addVehicle}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Add to Fleet</Text>}
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </Modal>

      {/* Driver Picker */}
      <Modal visible={showDriverPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.pickerModal}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select Driver</Text>
            <TouchableOpacity onPress={() => setShowDriverPicker(false)}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={[{ id: '', name: 'No driver', email: '' }, ...drivers]}
            keyExtractor={d => d.id || 'none'}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.pickRow, driverId === item.id && styles.pickRowActive]}
                onPress={() => { setDriverId(item.id); setShowDriverPicker(false) }}
              >
                <View>
                  <Text style={styles.pickName}>{item.name}</Text>
                  {item.email ? <Text style={styles.pickSub}>{item.email}</Text> : null}
                </View>
                {driverId === item.id && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            )}
          />
        </View>
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

function MField({ label, value, onChange, placeholder, keyboard }) {
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
      />
    </>
  )
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#f8fafc' },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 56, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  backText:        { color: '#16a34a', fontWeight: '600', fontSize: 14 },
  title:           { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  addBtn:          { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#16a34a', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnText:      { color: '#fff', fontWeight: '700', fontSize: 13 },
  list:            { padding: 16, gap: 10 },
  row:             { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  typeIcon:        { fontSize: 28 },
  rowInfo:         { flex: 1 },
  rowReg:          { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  rowName:         { fontSize: 12, color: '#475569', marginTop: 1 },
  rowSub:          { fontSize: 12, color: '#64748b', marginTop: 2 },
  rowRight:        { alignItems: 'flex-end', gap: 6 },
  statusPill:      { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  statusText:      { fontSize: 10, fontWeight: '700' },
  deleteBtn:       { padding: 4 },
  empty:           { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
  modal:           { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  modalHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 24 },
  modalTitle:      { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  mlabel:          { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 14, marginBottom: 6 },
  minput:          { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0f172a', backgroundColor: '#fff' },
  chipGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:            { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipActive:      { borderColor: '#16a34a', backgroundColor: '#dcfce7' },
  chipIcon:        { fontSize: 16 },
  chipText:        { fontSize: 13, color: '#64748b', fontWeight: '500' },
  chipTextActive:  { color: '#16a34a', fontWeight: '700' },
  picker:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff' },
  pickerText:      { fontSize: 15, color: '#0f172a', flex: 1 },
  saveBtn:         { backgroundColor: '#16a34a', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  saveBtnText:     { color: '#fff', fontWeight: '700', fontSize: 15 },
  pickerModal:     { flex: 1, backgroundColor: '#f8fafc' },
  pickerHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  pickerTitle:     { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  pickRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#fff' },
  pickRowActive:   { backgroundColor: '#f0fdf4' },
  pickName:        { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  pickSub:         { fontSize: 12, color: '#64748b', marginTop: 2 },
  checkmark:       { fontSize: 18, color: '#16a34a', fontWeight: '700' },
})
