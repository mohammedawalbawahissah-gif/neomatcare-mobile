/**
 * screens/dashboard/DashboardScreen.jsx
 * Original NeoMatCare dashboard UI — restored.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { dashboardAPI, casesAPI, referralsAPI, consultationsAPI, transportAPI } from '../../api/client';

const ROLE_LABELS = {
  health_worker:  'Health Worker',
  facility_admin: 'Facility Admin',
  specialist:     'Specialist',
  driver:         'Driver',
  superadmin:     'Superadmin',
};

export default function DashboardScreen({ navigation }) {
  const { user, userRole, logout } = useAuth();
  const [stats,   setStats]   = useState({});
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);

  const fullName = user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'User';

  const loadStats = useCallback(async () => {
    try {
      // Try dashboard API first, fall back to individual endpoints
      const results = await Promise.allSettled([
        casesAPI.getCases(),
        referralsAPI.getReferrals(),
        consultationsAPI.getConsultations(),
        transportAPI.getTransports(),
      ]);
      const count = (r) => {
        const d = r.value?.data;
        return Array.isArray(d) ? d.length : (d?.count ?? d?.results?.length ?? 0);
      };
      setStats({
        cases:         count(results[0]),
        referrals:     count(results[1]),
        consultations: count(results[2]),
        transport:     count(results[3]),
      });
    } catch {}
    setLoading(false);
    setRefresh(false);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const cards = [
    (userRole === 'health_worker' || userRole === 'superadmin') &&
      { label: 'Cases', value: stats.cases, color: '#16a34a', route: 'Cases' },
    (userRole === 'health_worker' || userRole === 'facility_admin' || userRole === 'superadmin') &&
      { label: 'Referrals', value: stats.referrals, color: '#2563eb', route: 'Referrals' },
    (userRole === 'health_worker' || userRole === 'specialist' || userRole === 'superadmin') &&
      { label: 'Consultations', value: stats.consultations, color: '#7c3aed', route: 'Consultations' },
    (userRole === 'driver' || userRole === 'superadmin') &&
      { label: 'Transport', value: stats.transport, color: '#d97706', route: 'Transport' },
  ].filter(Boolean);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refresh}
          onRefresh={() => { setRefresh(true); loadStats(); }}
          tintColor="#16a34a"
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {fullName.split(' ')[0]} 👋</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{ROLE_LABELS[userRole]}</Text>
          </View>
        </View>
        {user?.facility_name && (
          <Text style={styles.facility}>{user.facility_name}</Text>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color="#16a34a" style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Stats grid */}
          <View style={styles.grid}>
            {cards.map((card) => (
              <TouchableOpacity
                key={card.label}
                style={[styles.card, { borderLeftColor: card.color }]}
                onPress={() => navigation.navigate(card.route)}
              >
                <Text style={[styles.cardValue, { color: card.color }]}>
                  {card.value ?? '—'}
                </Text>
                <Text style={styles.cardLabel}>{card.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Quick action for health workers */}
          {userRole === 'health_worker' && (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.navigate('Cases')}
            >
              <Text style={styles.primaryBtnText}>+ New Emergency Case</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    backgroundColor: '#fff', padding: 24, paddingTop: 56,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  greeting:  { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  roleBadge: {
    marginTop: 4, backgroundColor: '#dcfce7', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start',
  },
  roleText: { fontSize: 11, color: '#16a34a', fontWeight: '600' },
  facility: { fontSize: 12, color: '#64748b', textAlign: 'right', maxWidth: 140 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    width: '47%', borderLeftWidth: 3,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardValue:  { fontSize: 28, fontWeight: '700' },
  cardLabel:  { fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: '500' },
  primaryBtn: {
    margin: 16, backgroundColor: '#16a34a', borderRadius: 12,
    padding: 16, alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
