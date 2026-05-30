/**
 * app/_layout.jsx
 * Root layout — wraps the entire app in AuthProvider,
 * sets up push notifications, and gates routes behind auth.
 */
import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider, useAuth } from '../src/contexts/AuthContext'
import { usePushNotifications } from '../src/hooks/usePushNotifications'

function AuthGate() {
  const { isAuthenticated, loading } = useAuth()
  const router   = useRouter()
  const segments = useSegments()

  usePushNotifications()

  useEffect(() => {
    if (loading) return
    const inAuth = segments[0] === 'login'
    if (!isAuthenticated && !inAuth) router.replace('/login')
    if (isAuthenticated && inAuth)  router.replace('/(tabs)')
  }, [isAuthenticated, loading, segments])

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}
