import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, Select, ErrorBanner } from '../../components/ui';
import { facilitiesAPI } from '../../api/client';
import Colors from '../../constants/colors';
import { Typography, Spacing, Radius } from '../../constants/theme';

const ROLE_OPTIONS = [
  { value: 'health_worker',  label: 'Health Worker' },
  { value: 'specialist',     label: 'Specialist' },
  { value: 'facility_admin', label: 'Facility Admin' },
  { value: 'driver',         label: 'Driver' },
  { value: 'superadmin',     label: 'Super Admin' },
];

// Roles that must pick a facility
const FACILITY_REQUIRED_ROLES = ['health_worker', 'facility_admin'];

const RegisterScreen = ({ navigation }) => {
  const { register } = useAuth();

  const [form, setForm] = useState({
    first_name:       '',
    last_name:        '',
    email:            '',
    phone:            '',
    role:             '',
    facility:         '',   // stores facility UUID
    password:         '',
    confirm_password: '',
  });
  const [errors, setErrors]             = useState({});
  const [loading, setLoading]           = useState(false);
  const [apiError, setApiError]         = useState('');
  const [facilities, setFacilities]     = useState([]);
  const [facilitiesLoading, setFacilitiesLoading] = useState(false);

  // ── Fetch facilities whenever a role that needs one is selected ──
  useEffect(() => {
    if (!FACILITY_REQUIRED_ROLES.includes(form.role)) {
      setFacilities([]);
      setForm((p) => ({ ...p, facility: '' }));
      return;
    }

    let cancelled = false;
    const fetchFacilities = async () => {
      setFacilitiesLoading(true);
      try {
        const res = await facilitiesAPI.getFacilities();
        if (!cancelled) {
          setFacilities(
            (res.data || []).map((f) => ({ value: f.id, label: f.name }))
          );
        }
      } catch {
        if (!cancelled) setFacilities([]);
      } finally {
        if (!cancelled) setFacilitiesLoading(false);
      }
    };
    fetchFacilities();
    return () => { cancelled = true; };
  }, [form.role]);

  const set = (field) => (value) => {
    setForm((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: '' }));
    if (apiError) setApiError('');
  };

  const validate = () => {
    const e = {};
    if (!form.first_name.trim()) e.first_name = 'First name is required';
    if (!form.last_name.trim())  e.last_name  = 'Last name is required';
    if (!form.email.trim())      e.email      = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.role)              e.role       = 'Please select a role';
    if (FACILITY_REQUIRED_ROLES.includes(form.role) && !form.facility)
      e.facility = `A facility is required for the ${form.role.replace('_', ' ')} role`;
    if (!form.password)          e.password   = 'Password is required';
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (!form.confirm_password)  e.confirm_password = 'Please confirm your password';
    else if (form.password !== form.confirm_password) e.confirm_password = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    setApiError('');

    const payload = {
      name:      `${form.first_name.trim()} ${form.last_name.trim()}`,
      email:     form.email.trim(),
      phone:     form.phone.trim(),
      role:      form.role,
      password:  form.password,
      password2: form.confirm_password,
    };
    if (form.facility) payload.facility = form.facility;

    const result = await register(payload);
    setLoading(false);
    if (!result.success) {
      setApiError(result.error || 'Registration failed. Please try again.');
    }
  };

  const needsFacility = FACILITY_REQUIRED_ROLES.includes(form.role);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand header */}
        <View style={styles.brandSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>N</Text>
          </View>
          <Text style={styles.brandName}>NeoMatCare</Text>
          <Text style={styles.brandTagline}>Create your account</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Register</Text>

          <ErrorBanner message={apiError} onDismiss={() => setApiError('')} />

          {/* Name row */}
          <View style={styles.row}>
            <Input
              label="First name"
              placeholder="John"
              value={form.first_name}
              onChangeText={set('first_name')}
              error={errors.first_name}
              style={styles.half}
              required
            />
            <View style={{ width: Spacing[3] }} />
            <Input
              label="Last name"
              placeholder="Doe"
              value={form.last_name}
              onChangeText={set('last_name')}
              error={errors.last_name}
              style={styles.half}
              required
            />
          </View>

          <Input
            label="Email address"
            placeholder="you@example.com"
            value={form.email}
            onChangeText={set('email')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            icon="mail-outline"
            error={errors.email}
            required
          />

          <Input
            label="Phone number"
            placeholder="+233 XX XXX XXXX"
            value={form.phone}
            onChangeText={set('phone')}
            keyboardType="phone-pad"
            icon="call-outline"
            error={errors.phone}
          />

          <Select
            label="Role"
            placeholder="Select your role"
            value={form.role}
            onValueChange={set('role')}
            options={ROLE_OPTIONS}
            error={errors.role}
            required
          />

          {/* Facility — dropdown for roles that require it, hidden otherwise */}
          {needsFacility && (
            facilitiesLoading ? (
              <View style={styles.facilityLoading}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.facilityLoadingText}>Loading facilities…</Text>
              </View>
            ) : (
              <Select
                label="Facility"
                placeholder="Select your facility"
                value={form.facility}
                onValueChange={set('facility')}
                options={facilities}
                error={errors.facility}
                required
              />
            )
          )}

          <Input
            label="Password"
            placeholder="Min. 8 characters"
            value={form.password}
            onChangeText={set('password')}
            secureTextEntry
            icon="lock-closed-outline"
            error={errors.password}
            required
          />

          <Input
            label="Confirm password"
            placeholder="Re-enter your password"
            value={form.confirm_password}
            onChangeText={set('confirm_password')}
            secureTextEntry
            icon="lock-closed-outline"
            error={errors.confirm_password}
            required
          />

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
            fullWidth
            size="lg"
            style={styles.submitBtn}
          />
        </View>

        {/* Login link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, padding: Spacing[5], paddingTop: Spacing[8] },

  brandSection: { alignItems: 'center', marginBottom: Spacing[6] },
  logoCircle:   { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing[3] },
  logoText:     { fontSize: 28, fontWeight: Typography.bold, color: Colors.white },
  brandName:    { fontSize: Typography['2xl'], fontWeight: Typography.bold, color: Colors.textPrimary },
  brandTagline: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 4 },

  card:      { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing[6], shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: Typography.xl, fontWeight: Typography.semibold, color: Colors.textPrimary, marginBottom: Spacing[5] },

  row:  { flexDirection: 'row' },
  half: { flex: 1 },

  facilityLoading:     { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing[3], gap: Spacing[2] },
  facilityLoadingText: { fontSize: Typography.sm, color: Colors.textSecondary },

  submitBtn: { marginTop: Spacing[2] },

  footer:     { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing[6], marginBottom: Spacing[4] },
  footerText: { fontSize: Typography.sm, color: Colors.textSecondary },
  footerLink: { fontSize: Typography.sm, color: Colors.primary, fontWeight: Typography.semibold },
});

export default RegisterScreen;
