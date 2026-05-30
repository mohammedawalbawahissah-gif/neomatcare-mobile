import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, StyleSheet, Image,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, ErrorBanner } from '../../components/ui';
import Colors from '../../constants/colors';
import { Typography, Spacing, Radius } from '../../constants/theme';

const LoginScreen = ({ navigation }) => {
  const { login, loading: authLoading } = useAuth();

  const [form, setForm]       = useState({ email: '', password: '' });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const set = (field) => (value) => {
    setForm((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: '' }));
    if (apiError) setApiError('');
  };

  const validate = () => {
    const e = {};
    if (!form.email.trim())    e.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password)        e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    setApiError('');
    const result = await login({ email: form.email.trim(), password: form.password });
    setLoading(false);
    if (!result.success) {
      setApiError(result.error || 'Login failed. Please try again.');
    }
    // On success, RootNavigator automatically switches to role tabs
  };

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
          <Text style={styles.brandTagline}>Emergency Referral System</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign in to your account</Text>

          <ErrorBanner message={apiError} onDismiss={() => setApiError('')} />

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
            returnKeyType="next"
          />

          <Input
            label="Password"
            placeholder="Enter your password"
            value={form.password}
            onChangeText={set('password')}
            secureTextEntry
            icon="lock-closed-outline"
            error={errors.password}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading || authLoading}
            fullWidth
            size="lg"
            style={styles.submitBtn}
          />
        </View>

        {/* Register link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}>Create account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing[5] },

  brandSection: { alignItems: 'center', marginBottom: Spacing[8] },
  logoCircle:   { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing[3] },
  logoText:     { fontSize: 36, fontWeight: Typography.bold, color: Colors.white },
  brandName:    { fontSize: Typography['3xl'], fontWeight: Typography.bold, color: Colors.textPrimary },
  brandTagline: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 4 },

  card:      { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing[6], shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: Typography.xl, fontWeight: Typography.semibold, color: Colors.textPrimary, marginBottom: Spacing[5] },

  submitBtn: { marginTop: Spacing[2] },

  footer:     { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing[6] },
  footerText: { fontSize: Typography.sm, color: Colors.textSecondary },
  footerLink: { fontSize: Typography.sm, color: Colors.primary, fontWeight: Typography.semibold },
});

export default LoginScreen;
