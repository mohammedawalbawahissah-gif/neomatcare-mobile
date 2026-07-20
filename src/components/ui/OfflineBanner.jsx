import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOfflineQueue } from '../../contexts/OfflineQueueContext';
import Colors from '../../constants/colors';
import { Typography, Spacing, Radius } from '../../constants/theme';

/**
 * Sits at the top of the app (mounted once in App.jsx, above the navigator).
 * Silent when there's nothing to report — only appears when offline or when
 * there's queued work waiting to sync, so it never competes for attention
 * during normal use.
 */
export default function OfflineBanner() {
  const { isOnline, pendingCount, syncing, sync } = useOfflineQueue();

  if (isOnline && pendingCount === 0) return null;

  const offline = !isOnline;

  return (
    <View style={[styles.banner, offline ? styles.bannerOffline : styles.bannerPending]}>
      <Ionicons
        name={offline ? 'cloud-offline-outline' : 'cloud-upload-outline'}
        size={15}
        color={offline ? Colors.dangerDark : Colors.warningDark}
        style={{ marginRight: 6 }}
      />
      <Text style={[styles.text, { color: offline ? Colors.dangerDark : Colors.warningDark }]}>
        {offline
          ? pendingCount > 0
            ? `Offline — ${pendingCount} record${pendingCount === 1 ? '' : 's'} saved locally, will sync when back online`
            : 'Offline — changes will be saved locally'
          : `Syncing ${pendingCount} saved record${pendingCount === 1 ? '' : 's'}…`}
      </Text>
      {!offline && (
        syncing
          ? <ActivityIndicator size="small" color={Colors.warningDark} style={{ marginLeft: 6 }} />
          : (
            <TouchableOpacity onPress={sync} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
  },
  bannerOffline: { backgroundColor: Colors.dangerLight },
  bannerPending: { backgroundColor: Colors.warningLight },
  text: { flex: 1, fontSize: Typography.xs, fontWeight: Typography.medium },
  retryBtn: {
    marginLeft: Spacing[2], paddingHorizontal: Spacing[3], paddingVertical: 4,
    borderRadius: Radius.full, backgroundColor: 'rgba(255,255,255,0.6)',
  },
  retryText: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.warningDark },
});
