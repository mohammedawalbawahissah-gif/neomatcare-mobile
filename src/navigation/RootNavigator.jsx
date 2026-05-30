import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { Spinner } from '../components/ui';
import Colors from '../constants/colors';
import { Typography } from '../constants/theme';

// ── Auth screens ──
import LoginScreen    from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// ── Shared screens ──
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import ProfileScreen   from '../screens/shared/ProfileScreen';

// ── Health worker ──
import CasesScreen      from '../screens/health-worker/CasesScreen';
import CaseDetailScreen from '../screens/health-worker/CaseDetailScreen';
import ReferralsScreen  from '../screens/referrals/ReferralsScreen';

// ── Specialist ──
import ConsultationsScreen from '../screens/specialist/ConsultationsScreen';

// ── Facility admin ──
import FacilityScreen from '../screens/facility-admin/FacilityScreen';

// ── Driver ──
import TransportScreen from '../screens/driver/TransportScreen';

// ── Superadmin ──
import FacilitiesScreen from '../screens/superadmin/FacilitiesScreen';
import UsersScreen      from '../screens/superadmin/UsersScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const NO_HEADER = { headerShown: false };

// ─────────────────────────────────────────────────────────────────────────────
// AUTH STACK
// ─────────────────────────────────────────────────────────────────────────────
const AuthStack = () => (
  <Stack.Navigator screenOptions={NO_HEADER}>
    <Stack.Screen name="Login"    component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH WORKER — nested stack inside tab so CaseDetail has no tab bar
// ─────────────────────────────────────────────────────────────────────────────
const HealthWorkerStack = () => (
  <Stack.Navigator screenOptions={NO_HEADER}>
    <Stack.Screen name="Cases"      component={CasesScreen} />
    <Stack.Screen name="CaseDetail" component={CaseDetailScreen} />
  </Stack.Navigator>
);

const HealthWorkerTabs = () => (
  <Tab.Navigator screenOptions={tabScreenOptions}>
    <Tab.Screen
      name="CasesTab"
      component={HealthWorkerStack}
      options={{ title: 'Cases', tabBarIcon: ({ color, size }) => <Ionicons name="medical-outline" size={size} color={color} /> }}
    />
    <Tab.Screen
      name="Referrals"
      component={ReferralsScreen}
      options={{ title: 'Referrals', tabBarIcon: ({ color, size }) => <Ionicons name="swap-horizontal-outline" size={size} color={color} /> }}
    />
    <Tab.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} /> }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} /> }}
    />
  </Tab.Navigator>
);

// ─────────────────────────────────────────────────────────────────────────────
// SPECIALIST TABS
// ─────────────────────────────────────────────────────────────────────────────
const SpecialistTabs = () => (
  <Tab.Navigator screenOptions={tabScreenOptions}>
    <Tab.Screen
      name="Consultations"
      component={ConsultationsScreen}
      options={{ title: 'Consultations', tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" size={size} color={color} /> }}
    />
    <Tab.Screen
      name="Referrals"
      component={ReferralsScreen}
      options={{ title: 'Referrals', tabBarIcon: ({ color, size }) => <Ionicons name="swap-horizontal-outline" size={size} color={color} /> }}
    />
    <Tab.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} /> }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} /> }}
    />
  </Tab.Navigator>
);

// ─────────────────────────────────────────────────────────────────────────────
// FACILITY ADMIN TABS
// ─────────────────────────────────────────────────────────────────────────────
const FacilityAdminTabs = () => (
  <Tab.Navigator screenOptions={tabScreenOptions}>
    <Tab.Screen
      name="Facility"
      component={FacilityScreen}
      options={{ title: 'Facility', tabBarIcon: ({ color, size }) => <Ionicons name="business-outline" size={size} color={color} /> }}
    />
    <Tab.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} /> }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} /> }}
    />
  </Tab.Navigator>
);

// ─────────────────────────────────────────────────────────────────────────────
// DRIVER TABS
// ─────────────────────────────────────────────────────────────────────────────
const DriverTabs = () => (
  <Tab.Navigator screenOptions={tabScreenOptions}>
    <Tab.Screen
      name="Transport"
      component={TransportScreen}
      options={{ title: 'Transport', tabBarIcon: ({ color, size }) => <Ionicons name="car-outline" size={size} color={color} /> }}
    />
    <Tab.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} /> }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} /> }}
    />
  </Tab.Navigator>
);

// ─────────────────────────────────────────────────────────────────────────────
// SUPERADMIN TABS
// ─────────────────────────────────────────────────────────────────────────────
const SuperadminTabs = () => (
  <Tab.Navigator screenOptions={tabScreenOptions}>
    <Tab.Screen
      name="Facilities"
      component={FacilitiesScreen}
      options={{ title: 'Facilities', tabBarIcon: ({ color, size }) => <Ionicons name="business-outline" size={size} color={color} /> }}
    />
    <Tab.Screen
      name="Users"
      component={UsersScreen}
      options={{ title: 'Users', tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} /> }}
    />
    <Tab.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} /> }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} /> }}
    />
  </Tab.Navigator>
);

// ─────────────────────────────────────────────────────────────────────────────
// ROOT NAVIGATOR
// ─────────────────────────────────────────────────────────────────────────────
const RootNavigator = () => {
  const { isAuthenticated, userRole, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <Spinner fullScreen />
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

// ─────────────────────────────────────────────────────────────────────────────
// SHARED TAB BAR STYLE
// ─────────────────────────────────────────────────────────────────────────────
const tabScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor:   Colors.primary,
  tabBarInactiveTintColor: Colors.gray400,
  tabBarStyle: {
    backgroundColor: Colors.white,
    borderTopColor:  Colors.border,
    borderTopWidth:  1,
    height:          60,
    paddingBottom:   8,
    paddingTop:      6,
  },
  tabBarLabelStyle: {
    fontSize:   Typography.xs,
    fontWeight: Typography.medium,
  },
};

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
});

export default RootNavigator;
