/**
 * app/(tabs)/_layout.jsx
 * Clean tab navigator — 5 tabs max per role.
 * SuperAdmin gets Admin tab instead of Cases/Consults/Transport.
 *
 * AssistantWidget is mounted here as a global overlay so it persists
 * across all tab screens without remounting.
 */
import { View, StyleSheet } from 'react-native'
import { Tabs } from 'expo-router'
import { useAuth } from '../../src/contexts/AuthContext'
import { Home, FolderHeart, Stethoscope, Truck, User, ShieldCheck } from 'lucide-react-native'
import AssistantWidget from '../../src/components/ai/AssistantWidget'

const TAB_BAR_STYLE = {
  backgroundColor: '#fff',
  borderTopColor:  '#f1f5f9',
  borderTopWidth:  1,
  paddingBottom:   8,
  paddingTop:      6,
  height:          64,
}

const ACTIVE_COLOR   = '#16a34a'
const INACTIVE_COLOR = '#94a3b8'

export default function TabLayout() {
  const { isDriver, isSpecialist, isHealthWorker, isFacilityAdmin, isSuperadmin } = useAuth()

  const showCases     = isHealthWorker || isFacilityAdmin
  const showConsults  = isHealthWorker || isSpecialist
  const showTransport = isDriver || isHealthWorker
  const showAdmin     = isSuperadmin

  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{
          headerShown:             false,
          tabBarStyle:             TAB_BAR_STYLE,
          tabBarActiveTintColor:   ACTIVE_COLOR,
          tabBarInactiveTintColor: INACTIVE_COLOR,
          tabBarLabelStyle:        { fontSize: 11, fontWeight: '600', marginTop: 2 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <Home size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="cases/index"
          options={{
            title: 'Cases',
            tabBarIcon: ({ color }) => <FolderHeart size={22} color={color} />,
            href: showCases ? undefined : null,
          }}
        />
        <Tabs.Screen
          name="consultations/index"
          options={{
            title: 'Consults',
            tabBarIcon: ({ color }) => <Stethoscope size={22} color={color} />,
            href: showConsults ? undefined : null,
          }}
        />
        <Tabs.Screen
          name="transport/index"
          options={{
            title: 'Transport',
            tabBarIcon: ({ color }) => <Truck size={22} color={color} />,
            href: showTransport ? undefined : null,
          }}
        />
        <Tabs.Screen
          name="admin/index"
          options={{
            title: 'Admin',
            tabBarIcon: ({ color }) => <ShieldCheck size={22} color={color} />,
            href: showAdmin ? undefined : null,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <User size={22} color={color} />,
          }}
        />

        {/* Hidden screens */}
        <Tabs.Screen name="cases/create"         options={{ href: null }} />
        <Tabs.Screen name="cases/suggest"        options={{ href: null }} />
        <Tabs.Screen name="cases/list"           options={{ href: null }} />
        <Tabs.Screen name="cases/[id]"           options={{ href: null }} />
        <Tabs.Screen name="referrals/index"      options={{ href: null }} />
        <Tabs.Screen name="referrals/[id]"       options={{ href: null }} />
        <Tabs.Screen name="consultations/list"   options={{ href: null }} />
        <Tabs.Screen name="consultations/[id]"   options={{ href: null }} />
        <Tabs.Screen name="admin/users"          options={{ href: null }} />
        <Tabs.Screen name="admin/vehicles"       options={{ href: null }} />
        <Tabs.Screen name="admin/specialists"    options={{ href: null }} />
      </Tabs>

      {/* Global AI Assistant — floats above all tab screens, role-aware */}
      <View style={styles.widgetOverlay} pointerEvents="box-none">
        <AssistantWidget />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  widgetOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99,
  },
})
