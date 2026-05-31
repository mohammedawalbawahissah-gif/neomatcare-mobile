/**
 * navigation/RootNavigator.jsx
 * Revamp architecture kept — role-based tab stacks.
 * Original tab bar style restored (#16a34a active, #f8fafc bg, height 64).
 */
import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../contexts/AuthContext';

// Auth
import LoginScreen    from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Shared
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import ProfileScreen   from '../screens/shared/ProfileScreen';

// Health worker
import CasesScreen      from '../screens/health-worker/CasesScreen';
import CaseDetailScreen from '../screens/health-worker/CaseDetailScreen';

// Referrals (shared)
import ReferralsScreen from '../screens/referrals/ReferralsScreen';

// Specialist
import ConsultationsScreen from '../screens/specialist/ConsultationsScreen';

// Facility admin
import FacilityScreen from '../screens/facility-admin/FacilityScreen';

// Driver
import TransportScreen from '../screens/driver/TransportScreen';

// Superadmin
import FacilitiesScreen from '../screens/superadmin/FacilitiesScreen';
import UsersScreen      from '../screens/superadmin/UsersScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();
const NO_HEADER = { headerShown: false };

// ─── Auth Stack ───────────────────────────────────────────────────────────────
const AuthStack = () => (
  <Stack.Navigator screenOptions={NO_HEADER}>
    <Stack.Screen name="Login"    component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

// ─── Health Worker ────────────────────────────────────────────────────────────
// Cases + CaseDetail live in a nested stack so the tab bar hides on detail
const CasesStack = () => (
  <Stack.Navigator screenOptions={NO_HEADER}>
    <Stack.Screen name="Cases"      component={CasesScreen} />
    <Stack.Screen name="CaseDetail" component={CaseDetailScreen} />
  </Stack.Navigator>
);

const HealthWorkerTabs = () => (
  <Tab.Navigator screenOptions={TAB_OPTIONS}>
    <Tab.Screen
      name="CasesTab"
      component={CasesStack}
      options={{ title: 'Cases', tabBarIcon: ({ color }) => <Ionicons name="medical-outline" size={22} color={color} /> }}
    />
    <Tab.Screen
      name="Referrals"
      component={ReferralsScreen}
      options={{ title: 'Referrals', tabBarIcon: ({ color }) => <Ionicons name="swap-horizontal-outline" size={22} color={color} /> }}
    />
    <Tab.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{ title: 'Home', tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={22} color={color} /> }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ title: 'Profile', tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={22} color={color} /> }}
    />
  </Tab.Navigator>
);

// ─── Specialist ───────────────────────────────────────────────────────────────
const SpecialistTabs = () => (
  <Tab.Navigator screenOptions={TAB_OPTIONS}>
    <Tab.Screen
      name="Consultations"
      component={ConsultationsScreen}
      options={{ title: 'Consults', tabBarIcon: ({ color }) => <Ionicons name="chatbubbles-outline" size={22} color={color} /> }}
    />
    <Tab.Screen
      name="Referrals"
      component={ReferralsScreen}
      options={{ title: 'Referrals', tabBarIcon: ({ color }) => <Ionicons name="swap-horizontal-outline" size={22} color={color} /> }}
    />
    <Tab.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{ title: 'Home', tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={22} color={color} /> }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ title: 'Profile', tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={22} color={color} /> }}
    />
  </Tab.Navigator>
);

// ─── Facility Admin ───────────────────────────────────────────────────────────
const FacilityAdminTabs = () => (
  <Tab.Navigator screenOptions={TAB_OPTIONS}>
    <Tab.Screen
      name="Referrals"
      component={ReferralsScreen}
      options={{ title: 'Referrals', tabBarIcon: ({ color }) => <Ionicons name="swap-horizontal-outline" size={22} color={color} /> }}
    />
    <Tab.Screen
      name="Facility"
      component={FacilityScreen}
      options={{ title: 'Facility', tabBarIcon: ({ color }) => <Ionicons name="business-outline" size={22} color={color} /> }}
    />
    <Tab.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{ title: 'Home', tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={22} color={color} /> }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ title: 'Profile', tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={22} color={color} /> }}
    />
  </Tab.Navigator>
);

// ─── Driver ───────────────────────────────────────────────────────────────────
const DriverTabs = () => (
  <Tab.Navigator screenOptions={TAB_OPTIONS}>
    <Tab.Screen
      name="Transport"
      component={TransportScreen}
      options={{ title: 'Transport', tabBarIcon: ({ color }) => <Ionicons name="car-outline" size={22} color={color} /> }}
    />
    <Tab.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{ title: 'Home', tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={22} color={color} /> }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ title: 'Profile', tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={22} color={color} /> }}
    />
  </Tab.Navigator>
);

// ─── Superadmin ───────────────────────────────────────────────────────────────
const SuperadminTabs = () => (
  <Tab.Navigator screenOptions={TAB_OPTIONS}>
    <Tab.Screen
      name="Facilities"
      component={FacilitiesScreen}
      options={{ title: 'Facilities', tabBarIcon: ({ color }) => <Ionicons name="business-outline" size={22} color={color} /> }}
    />
    <Tab.Screen
      name="Users"
      component={UsersScreen}
      options={{ title: 'Users', tabBarIcon: ({ color }) => <Ionicons name="people-outline" size={22} color={color} /> }}
    />
    <Tab.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{ title: 'Home', tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={22} color={color} /> }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ title: 'Profile', tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={22} color={color} /> }}
    />
  </Tab.Navigator>
);

// ─── Root Navigator ───────────────────────────────────────────────────────────
const RootNavigator = () => {
  const { isAuthenticated, userRole, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (!isAuthenticated) return <AuthStack />;

  switch (userRole) {
    case 'health_worker':  return <HealthWorkerTabs />;
    case 'specialist':     return <SpecialistTabs />;
    case 'facility_admin': return <FacilityAdminTabs />;
    case 'driver':         return <DriverTabs />;
    case 'superadmin':     return <SuperadminTabs />;
    default:               return <HealthWorkerTabs />;
  }
};

// ─── Shared tab bar style — matches original ──────────────────────────────────
const TAB_OPTIONS = {
  headerShown: false,
  tabBarActiveTintColor:   '#16a34a',
  tabBarInactiveTintColor: '#94a3b8',
  tabBarStyle: {
    backgroundColor: '#fff',
    borderTopColor:  '#f1f5f9',
    borderTopWidth:  1,
    paddingBottom:   8,
    paddingTop:      6,
    height:          64,
  },
  tabBarLabelStyle: {
    fontSize:   11,
    fontWeight: '600',
    marginTop:  2,
  },
};

const styles = StyleSheet.create({
  splash: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
});

export default RootNavigator;
