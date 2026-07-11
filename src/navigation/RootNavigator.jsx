/**
 * navigation/RootNavigator.jsx
 * Fixed:
 *  - HealthWorker now has Consultations + Transport tabs
 *  - SuperAdmin has Cases + Referrals + Consultations + Transport + Users + Facilities
 *  - FacilityAdmin has Cases + Consultations + Transport
 *  - All tab screen names match navigation.navigate() call sites exactly
 *  - CasesStack exposes both "Cases" and "CaseDetail" so dashboard navigation works
 */
import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../contexts/AuthContext';

// Auth
import LoginScreen           from '../screens/auth/LoginScreen';
import RegisterScreen        from '../screens/auth/RegisterScreen';
import PatientRegisterScreen from '../screens/auth/PatientRegisterScreen';

// Shared
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import ProfileScreen   from '../screens/shared/ProfileScreen';

// Health worker
import CasesScreen       from '../screens/health-worker/CasesScreen';
import CaseDetailScreen  from '../screens/health-worker/CaseDetailScreen';
import CaseCreateScreen  from '../screens/health-worker/CaseCreateScreen';

// Patients (shared: health_worker, facility_admin, superadmin)
import PatientsScreen      from '../screens/patients/PatientsScreen';
import PatientDetailScreen from '../screens/patients/PatientDetailScreen';
import PatientCreateScreen from '../screens/patients/PatientCreateScreen';

// Referrals (shared)
import ReferralsScreen       from '../screens/referrals/ReferralsScreen';
import ReferralDetailScreen  from '../screens/referrals/ReferralDetailScreen';

// Specialist
import ConsultationsScreen       from '../screens/consultations/ConsultationsScreen';
import ConsultationDetailScreen  from '../screens/consultations/ConsultationDetailScreen';

// Facility admin
import FacilityScreen from '../screens/facility-admin/FacilityScreen';

// Driver
import TransportScreen       from '../screens/transport/TransportScreen';
import MyDispatchesScreen    from '../screens/driver/MyDispatchesScreen';

// Superadmin
import FacilitiesScreen from '../screens/superadmin/FacilitiesScreen';
import UsersScreen      from '../screens/superadmin/UsersScreen';

// Patient portal
import PatientPortalScreen from '../screens/patient-portal/PatientPortalScreen';

import { usePushNotifications } from '../hooks/usePushNotifications';
import AssistantWidget from '../components/ai/AssistantWidget';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();
const NO_HEADER = { headerShown: false };

// ─── Auth Stack ───────────────────────────────────────────────────────────────
const AuthStack = () => (
  <Stack.Navigator screenOptions={NO_HEADER}>
    <Stack.Screen name="Login"           component={LoginScreen} />
    <Stack.Screen name="Register"        component={RegisterScreen} />
    <Stack.Screen name="PatientRegister" component={PatientRegisterScreen} />
  </Stack.Navigator>
);

// ─── Cases Stack ─────────────────────────────────────────────────────────────
// Wraps Cases list + CaseDetail so tab bar stays visible on list,
// hides on detail. Screen name "Cases" must match navigation.navigate('Cases').
const CasesStack = () => (
  <Stack.Navigator screenOptions={NO_HEADER}>
    <Stack.Screen name="Cases"      component={CasesScreen} />
    <Stack.Screen name="CaseDetail" component={CaseDetailScreen} />
    <Stack.Screen name="CaseCreate" component={CaseCreateScreen} />
  </Stack.Navigator>
);

// ─── Patients Stack ──────────────────────────────────────────────────────────
const PatientsStack = () => (
  <Stack.Navigator screenOptions={NO_HEADER}>
    <Stack.Screen name="PatientsList"   component={PatientsScreen} />
    <Stack.Screen name="PatientDetail"  component={PatientDetailScreen} />
    <Stack.Screen name="PatientCreate"  component={PatientCreateScreen} />
  </Stack.Navigator>
);

// ─── Referrals Stack ─────────────────────────────────────────────────────────
const ReferralsStack = () => (
  <Stack.Navigator screenOptions={NO_HEADER}>
    <Stack.Screen name="ReferralsList"  component={ReferralsScreen} />
    <Stack.Screen name="ReferralDetail" component={ReferralDetailScreen} />
    <Stack.Screen name="CaseDetail"     component={CaseDetailScreen} />
  </Stack.Navigator>
);

// ─── Consultations Stack ─────────────────────────────────────────────────────
const ConsultationsStack = () => (
  <Stack.Navigator screenOptions={NO_HEADER}>
    <Stack.Screen name="ConsultationsList"   component={ConsultationsScreen} />
    <Stack.Screen name="ConsultationDetail"  component={ConsultationDetailScreen} />
    <Stack.Screen name="ReferralDetail"      component={ReferralDetailScreen} />
    <Stack.Screen name="CaseDetail"          component={CaseDetailScreen} />
  </Stack.Navigator>
);

// ─── Shared tab bar options ───────────────────────────────────────────────────
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

const icon = (name) => ({ color }) => <Ionicons name={name} size={22} color={color} />;

// ─── Health Worker ─────────────────────────────────────────────────────────
// Has: Cases, Referrals, Consultations, Transport, Home, Profile
const HealthWorkerTabs = () => (
  <Tab.Navigator screenOptions={TAB_OPTIONS}>
    <Tab.Screen
      name="CasesTab"
      component={CasesStack}
      options={{ title: 'Cases', tabBarIcon: icon('medical-outline') }}
    />
    <Tab.Screen
      name="PatientsTab"
      component={PatientsStack}
      options={{ title: 'Patients', tabBarIcon: icon('people-outline') }}
    />
    <Tab.Screen
      name="Referrals"
      component={ReferralsStack}
      options={{ title: 'Referrals', tabBarIcon: icon('swap-horizontal-outline') }}
    />
    <Tab.Screen
      name="Consultations"
      component={ConsultationsStack}
      options={{ title: 'Consults', tabBarIcon: icon('chatbubbles-outline') }}
    />
    <Tab.Screen
      name="Transport"
      component={TransportScreen}
      options={{ title: 'Transport', tabBarIcon: icon('car-outline') }}
    />
    <Tab.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{ title: 'Home', tabBarIcon: icon('home-outline') }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ title: 'Profile', tabBarIcon: icon('person-outline') }}
    />
  </Tab.Navigator>
);

// ─── Specialist ───────────────────────────────────────────────────────────────
const SpecialistTabs = () => (
  <Tab.Navigator screenOptions={TAB_OPTIONS}>
    <Tab.Screen
      name="Consultations"
      component={ConsultationsStack}
      options={{ title: 'Consults', tabBarIcon: icon('chatbubbles-outline') }}
    />
    <Tab.Screen
      name="Referrals"
      component={ReferralsStack}
      options={{ title: 'Referrals', tabBarIcon: icon('swap-horizontal-outline') }}
    />
    <Tab.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{ title: 'Home', tabBarIcon: icon('home-outline') }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ title: 'Profile', tabBarIcon: icon('person-outline') }}
    />
  </Tab.Navigator>
);

// ─── Facility Admin ───────────────────────────────────────────────────────────
// Has: Cases, Referrals, Consultations, Transport, Facility, Home, Profile
const FacilityAdminTabs = () => (
  <Tab.Navigator screenOptions={TAB_OPTIONS}>
    <Tab.Screen
      name="CasesTab"
      component={CasesStack}
      options={{ title: 'Cases', tabBarIcon: icon('medical-outline') }}
    />
    <Tab.Screen
      name="PatientsTab"
      component={PatientsStack}
      options={{ title: 'Patients', tabBarIcon: icon('people-outline') }}
    />
    <Tab.Screen
      name="Referrals"
      component={ReferralsStack}
      options={{ title: 'Referrals', tabBarIcon: icon('swap-horizontal-outline') }}
    />
    <Tab.Screen
      name="Consultations"
      component={ConsultationsStack}
      options={{ title: 'Consults', tabBarIcon: icon('chatbubbles-outline') }}
    />
    <Tab.Screen
      name="Transport"
      component={TransportScreen}
      options={{ title: 'Transport', tabBarIcon: icon('car-outline') }}
    />
    <Tab.Screen
      name="Facility"
      component={FacilityScreen}
      options={{ title: 'Facility', tabBarIcon: icon('business-outline') }}
    />
    <Tab.Screen
      name="Users"
      component={UsersScreen}
      options={{ title: 'Users', tabBarIcon: icon('people-circle-outline') }}
    />
    <Tab.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{ title: 'Home', tabBarIcon: icon('home-outline') }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ title: 'Profile', tabBarIcon: icon('person-outline') }}
    />
  </Tab.Navigator>
);

// ─── Driver ───────────────────────────────────────────────────────────────────
const DriverTabs = () => (
  <Tab.Navigator screenOptions={TAB_OPTIONS}>
    <Tab.Screen
      name="Transport"
      component={MyDispatchesScreen}
      options={{ title: 'Dispatches', tabBarIcon: icon('car-outline') }}
    />
    <Tab.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{ title: 'Home', tabBarIcon: icon('home-outline') }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ title: 'Profile', tabBarIcon: icon('person-outline') }}
    />
  </Tab.Navigator>
);

// ─── Superadmin ───────────────────────────────────────────────────────────────
// Has access to everything
const SuperadminStack = () => (
  <Stack.Navigator screenOptions={NO_HEADER}>
    <Stack.Screen name="Cases"      component={CasesScreen} />
    <Stack.Screen name="CaseDetail" component={CaseDetailScreen} />
    <Stack.Screen name="CaseCreate" component={CaseCreateScreen} />
  </Stack.Navigator>
);

const SuperadminTabs = () => (
  <Tab.Navigator screenOptions={TAB_OPTIONS}>
    <Tab.Screen
      name="CasesTab"
      component={SuperadminStack}
      options={{ title: 'Cases', tabBarIcon: icon('medical-outline') }}
    />
    <Tab.Screen
      name="PatientsTab"
      component={PatientsStack}
      options={{ title: 'Patients', tabBarIcon: icon('people-outline') }}
    />
    <Tab.Screen
      name="Referrals"
      component={ReferralsStack}
      options={{ title: 'Referrals', tabBarIcon: icon('swap-horizontal-outline') }}
    />
    <Tab.Screen
      name="Consultations"
      component={ConsultationsStack}
      options={{ title: 'Consults', tabBarIcon: icon('chatbubbles-outline') }}
    />
    <Tab.Screen
      name="Transport"
      component={TransportScreen}
      options={{ title: 'Transport', tabBarIcon: icon('car-outline') }}
    />
    <Tab.Screen
      name="Facilities"
      component={FacilitiesScreen}
      options={{ title: 'Facilities', tabBarIcon: icon('business-outline') }}
    />
    <Tab.Screen
      name="Users"
      component={UsersScreen}
      options={{ title: 'Users', tabBarIcon: icon('people-outline') }}
    />
    <Tab.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{ title: 'Home', tabBarIcon: icon('home-outline') }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ title: 'Profile', tabBarIcon: icon('person-outline') }}
    />
  </Tab.Navigator>
);

// ─── Patient (portal user) ─────────────────────────────────────────────────────
// NOTE: minimal placeholder — full patient portal (case history, reviews) is
// being built in the next phase of this rewrite. This prevents a crash/wrong
// permissions for role=patient in the meantime.
const PatientTabs = () => (
  <Tab.Navigator screenOptions={TAB_OPTIONS}>
    <Tab.Screen
      name="Portal"
      component={PatientPortalScreen}
      options={{ title: 'My Care', tabBarIcon: icon('heart-outline') }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ title: 'Profile', tabBarIcon: icon('person-outline') }}
    />
  </Tab.Navigator>
);

// ─── Root Navigator ───────────────────────────────────────────────────────────
const RootNavigator = () => {
  const { isAuthenticated, userRole, loading } = useAuth();
  usePushNotifications(isAuthenticated);

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (!isAuthenticated) return <AuthStack />;

  const RoleTabs = {
    health_worker:  HealthWorkerTabs,
    specialist:     SpecialistTabs,
    facility_admin: FacilityAdminTabs,
    driver:         DriverTabs,
    superadmin:     SuperadminTabs,
    patient:        PatientTabs,
  }[userRole] || HealthWorkerTabs;

  return (
    <>
      <RoleTabs />
      <AssistantWidget />
    </>
  );
};

const styles = StyleSheet.create({
  splash: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
});

export default RootNavigator;
