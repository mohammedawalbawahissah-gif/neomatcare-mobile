import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../contexts/AuthContext';
import { dashboardAPI, getErrorMessage } from '../../api/client';
import {
  Card, StatCard, Spinner, EmptyState, RoleBadge,
  Avatar, StatusBadge, SectionHeader, ErrorBanner,
} from '../../components/ui';
import Colors from '../../constants/colors';
import { Typography, Spacing, Radius } from '../../constants/theme';

const DashboardScreen = () => {
  const { user, userRole, logout } = useAuth();
  const [stats, setStats]         = useState(null);
  const [activity, setActivity]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState('');

  const fetchData = useCallback(async () => {
    try {
      setError('');
      const [statsRes, activityRes] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getRecentActivity(),
      ]);
      setStats(statsRes.data);
      setActivity(activityRes.data?.results || activityRes.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'User';

  // ── Role-specific stat configs ──
  const statConfigs = getRoleStats(userRole, stats);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Avatar name={fullName} size={44} />
            <View style={styles.headerInfo}>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.userName} numberOfLines={1}>{fullName}</Text>
              <RoleBadge role={userRole} />
            </View>
          </View>
          <Ionicons name="notifications-outline" size={24} color={Colors.textSecondary} />
        </View>

        <ErrorBanner message={error} onDismiss={() => setError('')} />

        {loading && !refreshing ? (
          <View style={styles.loadingBox}>
            <Spinner />
          </View>
        ) : (
          <>
            {/* Stats grid */}
            {statConfigs.length > 0 && (
              <View style={styles.section}>
                <SectionHeader title="Overview" />
                <View style={styles.statsGrid}>
                  {statConfigs.map((s, i) => (
                    <StatCard
                      key={i}
                      label={s.label}
                      value={s.value}
                      icon={s.icon}
                      color={s.color}
                      style={styles.statItem}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Recent activity */}
            <View style={styles.section}>
              <SectionHeader title="Recent Activity" />
              {activity.length === 0 ? (
                <EmptyState
                  icon="time-outline"
                  title="No recent activity"
                  message="Your recent actions will appear here."
                />
              ) : (
                activity.slice(0, 10).map((item, i) => (
                  <ActivityItem key={item.id || i} item={item} />
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Activity row ─────────────────────────────────────────────────────────────
const ActivityItem = ({ item }) => (
  <Card style={styles.activityCard}>
    <View style={styles.activityRow}>
      <View style={[styles.activityDot, { backgroundColor: Colors.primary + '30' }]}>
        <Ionicons name={getActivityIcon(item.type)} size={14} color={Colors.primary} />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>{item.description || item.title || 'Activity'}</Text>
        {item.status && <StatusBadge status={item.status} />}
      </View>
      <Text style={styles.activityTime}>{formatTime(item.created_at)}</Text>
    </View>
  </Card>
);

const getActivityIcon = (type) => {
  const map = { case: 'medical-outline', referral: 'swap-horizontal-outline', transport: 'car-outline', consultation: 'chatbubble-outline' };
  return map[type] || 'ellipse-outline';
};

const formatTime = (dt) => {
  if (!dt) return '';
  const d = new Date(dt);
  const now = new Date();
  const diff = Math.floor((now - d) / 60000);
  if (diff < 1)   return 'Just now';
  if (diff < 60)  return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return d.toLocaleDateString();
};

// ─── Role-specific stats ──────────────────────────────────────────────────────
const getRoleStats = (role, s) => {
  if (!s) return [];
  switch (role) {
    case 'health_worker': return [
      { label: 'Active Cases',      value: s.active_cases,      icon: 'medical-outline',         color: Colors.primary },
      { label: 'Total Cases',       value: s.total_cases,       icon: 'folder-outline',          color: Colors.secondary },
      { label: 'Pending Referrals', value: s.pending_referrals, icon: 'swap-horizontal-outline', color: Colors.warning },
      { label: 'Completed',         value: s.completed_cases,   icon: 'checkmark-circle-outline', color: Colors.success },
    ];
    case 'specialist': return [
      { label: 'Consultations',     value: s.total_consultations, icon: 'chatbubbles-outline',     color: Colors.primary },
      { label: 'Pending',           value: s.pending_consultations, icon: 'time-outline',          color: Colors.warning },
      { label: 'Referrals',         value: s.total_referrals,     icon: 'swap-horizontal-outline', color: Colors.secondary },
      { label: 'Completed',         value: s.completed_consultations, icon: 'checkmark-circle-outline', color: Colors.success },
    ];
    case 'facility_admin': return [
      { label: 'Staff Members',     value: s.total_staff,     icon: 'people-outline',     color: Colors.primary },
      { label: 'Active Cases',      value: s.active_cases,    icon: 'medical-outline',    color: Colors.secondary },
      { label: 'Capacity',          value: s.capacity,        icon: 'bed-outline',        color: Colors.warning },
      { label: 'Referrals Today',   value: s.referrals_today, icon: 'today-outline',      color: Colors.success },
    ];
    case 'driver': return [
      { label: 'Active Trips',      value: s.active_transports,    icon: 'car-outline',              color: Colors.primary },
      { label: 'Total Trips',       value: s.total_transports,     icon: 'navigate-outline',         color: Colors.secondary },
      { label: 'Completed Today',   value: s.completed_today,      icon: 'checkmark-circle-outline', color: Colors.success },
      { label: 'Pending',           value: s.pending_transports,   icon: 'time-outline',             color: Colors.warning },
    ];
    case 'superadmin': return [
      { label: 'Facilities',        value: s.total_facilities,  icon: 'business-outline',  color: Colors.primary },
      { label: 'Total Users',       value: s.total_users,       icon: 'people-outline',    color: Colors.secondary },
      { label: 'Active Cases',      value: s.active_cases,      icon: 'medical-outline',   color: Colors.warning },
      { label: 'Referrals',         value: s.total_referrals,   icon: 'swap-horizontal-outline', color: Colors.success },
    ];
    default: return [];
  }
};

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing[4], paddingBottom: Spacing[10] },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing[5] },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerInfo:  { marginLeft: Spacing[3], flex: 1 },
  greeting:    { fontSize: Typography.xs, color: Colors.textSecondary },
  userName:    { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary, marginVertical: 2 },

  loadingBox:  { paddingVertical: Spacing[10], alignItems: 'center' },

  section:    { marginBottom: Spacing[5] },
  statsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[3] },
  statItem:   { width: '47%' },

  activityCard: { marginBottom: Spacing[2], padding: Spacing[3] },
  activityRow:  { flexDirection: 'row', alignItems: 'center' },
  activityDot:  { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: Spacing[3] },
  activityContent: { flex: 1 },
  activityTitle:   { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textPrimary, marginBottom: 4 },
  activityTime:    { fontSize: Typography.xs, color: Colors.textMuted, marginLeft: Spacing[2] },
});

export default DashboardScreen;
