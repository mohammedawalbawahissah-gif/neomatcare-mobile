import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/colors';
import { Typography, Spacing, Shadow } from '../../constants/theme';

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN WRAPPER
// Replaces AppLayout for mobile. Handles safe area + status bar.
// ─────────────────────────────────────────────────────────────────────────────
export const ScreenWrapper = ({
  children,
  scroll = false,
  style,
  contentStyle,
  backgroundColor = Colors.background,
  statusBarStyle = 'dark-content',
}) => {
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={statusBarStyle} backgroundColor={backgroundColor} />
      {scroll ? (
        <ScrollView
          style={[styles.scroll, style]}
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flat, style, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN HEADER
// Top navigation bar — mirrors AppLayout's topbar
// ─────────────────────────────────────────────────────────────────────────────
export const ScreenHeader = ({
  title,
  subtitle,
  onBack,
  rightAction,
  backgroundColor = Colors.white,
}) => {
  return (
    <View style={[styles.header, { backgroundColor }, Shadow.sm]}>
      <View style={styles.headerLeft}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        )}
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
          {subtitle && <Text style={styles.headerSubtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>
      </View>
      {rightAction && (
        <View style={styles.headerRight}>{rightAction}</View>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGE HEADER (inside scroll — section title + description)
// ─────────────────────────────────────────────────────────────────────────────
export const PageHeader = ({ title, description, style }) => (
  <View style={[styles.pageHeader, style]}>
    <Text style={styles.pageTitle}>{title}</Text>
    {description && <Text style={styles.pageDesc}>{description}</Text>}
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:          { flex: 1 },
  scroll:        { flex: 1 },
  scrollContent: { padding: Spacing[4], paddingBottom: Spacing[10] },
  flat:          { flex: 1, padding: Spacing[4] },

  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], borderBottomWidth: 1, borderBottomColor: Colors.border, minHeight: 56 },
  headerLeft:    { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerTitles:  { flex: 1 },
  headerTitle:   { fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.textPrimary },
  headerSubtitle:{ fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 1 },
  headerRight:   { flexDirection: 'row', alignItems: 'center', marginLeft: Spacing[3] },
  backBtn:       { marginRight: Spacing[3] },

  pageHeader: { marginBottom: Spacing[4] },
  pageTitle:  { fontSize: Typography['2xl'], fontWeight: Typography.bold, color: Colors.textPrimary },
  pageDesc:   { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 4 },
});
