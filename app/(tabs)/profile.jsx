/**
 * app/(tabs)/profile.jsx
 * Profile screen — shows user info and handles logout for all roles.
 */
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView,
} from 'react-native'
import { useAuth } from '../../src/contexts/AuthContext'

const ROLE_LABELS = {
  health_worker:  'Health Worker',
  facility_admin: 'Facility Admin',
  specialist:     'Specialist',
  driver:         'Driver',
  superadmin:     'Superadmin',
}

const ROLE_COLORS = {
  health_worker:  '#16a34a',
  facility_admin: '#2563eb',
  specialist:     '#7c3aed',
  driver:         '#d97706',
  superadmin:     '#dc2626',
}

export default function ProfileScreen() {
  const { user, logout } = useAuth()

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ])
  }

  const color = ROLE_COLORS[user?.role] || '#64748b'

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={[styles.avatar, { backgroundColor: color }]}>
          <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || 'U'}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <View style={[styles.roleBadge, { backgroundColor: color + '20' }]}>
          <Text style={[styles.roleText, { color }]}>{ROLE_LABELS[user?.role]}</Text>
        </View>
      </View>

      {/* Info rows */}
      <View style={styles.section}>
        <InfoRow label="Email"    value={user?.email} />
        {user?.facility_name && <InfoRow label="Facility" value={user.facility_name} />}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || '—'}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  title:         { fontSize: 20, fontWeight: '700', color: '#0f172a', paddingTop: 48, marginBottom: 24 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  name:       { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  roleBadge:  { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  roleText:   { fontSize: 12, fontWeight: '700' },
  section: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 20, gap: 12,
  },
  row:       { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel:  { fontSize: 14, color: '#64748b', fontWeight: '600' },
  rowValue:  { fontSize: 14, color: '#0f172a', maxWidth: '60%', textAlign: 'right' },
  logoutBtn: {
    backgroundColor: '#fee2e2', borderRadius: 12,
    padding: 16, alignItems: 'center',
  },
  logoutText: { color: '#dc2626', fontWeight: '700', fontSize: 15 },
})
