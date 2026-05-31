/**
 * screens/auth/LoginScreen.jsx
 * Original NeoMatCare login UI — restored.
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    const result = await login({ email: email.trim().toLowerCase(), password });
    setLoading(false);
    if (!result.success) {
      Alert.alert('Login failed', result.error || 'Invalid email or password.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.logoRow}>
            <View style={styles.logoDot} />
            <Text style={styles.logoText}>NeoMatCare</Text>
          </View>
          <Text style={styles.subtitle}>Emergency Referral System</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@facility.org"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Sign In</Text>
            }
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}>Create account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll:    { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 28,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  logoRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  logoDot:    { width: 10, height: 10, borderRadius: 5, backgroundColor: '#16a34a', marginRight: 8 },
  logoText:   { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  subtitle:   { fontSize: 13, color: '#64748b', marginBottom: 28 },
  label:      { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#0f172a', marginBottom: 16,
  },
  btn:         { backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: '#fff', fontWeight: '700', fontSize: 15 },
  footer:      { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText:  { fontSize: 13, color: '#64748b' },
  footerLink:  { fontSize: 13, color: '#16a34a', fontWeight: '600' },
});
