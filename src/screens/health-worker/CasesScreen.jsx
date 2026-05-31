/**
 * screens/health-worker/CasesScreen.jsx
 * Original NeoMatCare cases UI — restored with new API + search/filter logic.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, RefreshControl, ActivityIndicator, Alert, Modal, ScrollView,
} from 'react-native';
import { casesAPI, facilitiesAPI, getErrorMessage } from '../../api/client';

const DANGER_COLORS = {
  PPH: '#dc2626', APH: '#dc2626', RUPTURED_UTERUS: '#dc2626',
  ECLAMPSIA: '#ea580c', SEVERE_PRE_ECLAMPSIA: '#ea580c', CORD_PROLAPSE: '#dc2626',
  OBSTRUCTED_LABOUR: '#ea580c', PUERPERAL_SEPSIS: '#d97706',
  NEONATAL_DISTRESS: '#ea580c', PRETERM_LABOUR: '#d97706',
  NEONATAL_SEPSIS: '#dc2626', SEVERE_ANAEMIA: '#d97706',
  MALPRESENTATION: '#d97706', CHORIOAMNIONITIS: '#d97706',
};

const ALL_DANGER_SIGNS = [
  { code: 'PPH', label: 'PPH' }, { code: 'APH', label: 'APH' },
  { code: 'RUPTURED_UTERUS', label: 'Ruptured Uterus' },
  { code: 'ECLAMPSIA', label: 'Eclampsia' },
  { code: 'SEVERE_PRE_ECLAMPSIA', label: 'Severe Pre-Eclampsia' },
  { code: 'OBSTRUCTED_LABOUR', label: 'Obstructed Labour' },
  { code: 'CORD_PROLAPSE', label: 'Cord Prolapse' },
  { code: 'PUERPERAL_SEPSIS', label: 'Puerperal Sepsis' },
  { code: 'CHORIOAMNIONITIS', label: 'Chorioamnionitis' },
  { code: 'NEONATAL_DISTRESS', label: 'Neonatal Distress' },
  { code: 'PRETERM_LABOUR', label: 'Preterm Labour' },
  { code: 'NEONATAL_SEPSIS', label: 'Neonatal Sepsis' },
  { code: 'SEVERE_ANAEMIA', label: 'Severe Anaemia' },
  { code: 'MALPRESENTATION', label: 'Malpresentation' },
];

export default function CasesScreen({ navigation }) {
  const [cases,      setCases]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    try {
      const params = {};
      if (search) params.search = search;
      const res = await casesAPI.getCases(params);
      setCases(Array.isArray(res.data) ? res.data : res.data?.results || []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [load]);

  const renderItem = ({ item }) => {
    const signs    = item.danger_signs || [];
    const topColor = DANGER_COLORS[signs[0]] || '#64748b';
    const name     = item.patient?.patient_name ||
      `${item.patient?.first_name || ''} ${item.patient?.last_name || ''}`.trim() ||
      item.patient_name || 'Unknown Patient';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('CaseDetail', { caseId: item.id })}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.facility}>{item.referring_facility_name || item.facility_name || '—'}</Text>
          </View>
          {signs.length > 0 && <View style={[styles.dot, { backgroundColor: topColor }]} />}
        </View>
        {signs.length > 0 && (
          <View style={styles.signsRow}>
            {signs.slice(0, 3).map(s => (
              <View key={s} style={[styles.signBadge, { backgroundColor: (DANGER_COLORS[s] || '#64748b') + '20' }]}>
                <Text style={[styles.signText, { color: DANGER_COLORS[s] || '#64748b' }]}>
                  {s.replace(/_/g, ' ')}
                </Text>
              </View>
            ))}
            {signs.length > 3 && <Text style={styles.more}>+{signs.length - 3}</Text>}
          </View>
        )}
        {item.presenting_complaint && (
          <Text style={styles.complaint} numberOfLines={1}>{item.presenting_complaint}</Text>
        )}
        {item.diagnosis && !item.presenting_complaint && (
          <Text style={styles.complaint} numberOfLines={1}>{item.diagnosis}</Text>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) return <ActivityIndicator style={styles.loader} color="#16a34a" />;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Cases</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
          <Text style={styles.addBtnText}>+ New Case</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search cases..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={cases}
        keyExtractor={c => String(c.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor="#16a34a"
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {search ? 'No cases match your search.' : 'No cases yet.'}
          </Text>
        }
      />

      <CreateCaseModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(newCase) => {
          setShowCreate(false);
          load();
          navigation.navigate('CaseDetail', { caseId: newCase.id });
        }}
      />
    </View>
  );
}

// ── Create Case Modal ──────────────────────────────────────────────────────────
// Fields match EmergencyCaseCreateSerializer exactly (mirrors web frontend)
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'];

function CreateCaseModal({ visible, onClose, onCreated }) {
  const INIT = {
    patient_name: '', hospital_id: '', phone: '', age: '',
    patient_town: '', blood_group: 'unknown', anc_visits: '',
    referring_facility: '',
    gestational_age_weeks: '', gravida: '', parity: '',
    obstetric_history: '',
    presenting_complaint: '',
    danger_signs: [],
    membranes_status: 'unknown',
    fetal_heart_rate: '',
    vital_signs: { systolic_bp: '', diastolic_bp: '', heart_rate: '', respiratory_rate: '', temperature: '', spo2: '' },
  };

  const [form,       setForm]       = useState(INIT);
  const [facilities, setFacilities] = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [apiError,   setApiError]   = useState('');

  const set     = (f) => (v) => setForm(p => ({ ...p, [f]: v }));
  const setVital = (f) => (v) => setForm(p => ({ ...p, vital_signs: { ...p.vital_signs, [f]: v } }));

  const toggleSign = (code) => {
    setForm(p => ({
      ...p,
      danger_signs: p.danger_signs.includes(code)
        ? p.danger_signs.filter(s => s !== code)
        : [...p.danger_signs, code],
    }));
  };

  // Load facilities when modal opens
  React.useEffect(() => {
    if (!visible) return;
    setForm(INIT);
    setApiError('');
    facilitiesAPI.getFacilities()
      .then(r => setFacilities(Array.isArray(r.data) ? r.data : r.data?.results || []))
      .catch(() => {});
  }, [visible]);

  const handleCreate = async () => {
    if (!form.patient_name.trim()) { Alert.alert('Required', 'Patient name is required.'); return; }
    if (!form.presenting_complaint.trim()) { Alert.alert('Required', 'Presenting complaint is required.'); return; }
    if (!form.referring_facility) { Alert.alert('Required', 'Please select a referring facility.'); return; }

    setLoading(true); setApiError('');
    try {
      // Strip empty vital sign fields
      const vital_signs = {};
      Object.entries(form.vital_signs).forEach(([k, v]) => { if (v !== '') vital_signs[k] = Number(v); });

      const payload = {
        patient_name:          form.patient_name.trim(),
        patient_age:           form.age ? Number(form.age) : undefined,
        patient_phone_number:  form.phone.trim() || undefined,
        hospital_id:           form.hospital_id.trim() || undefined,
        patient_town:          form.patient_town.trim() || undefined,
        patient_blood_group:   form.blood_group,
        patient_anc_visits:    form.anc_visits ? Number(form.anc_visits) : 0,
        presenting_complaint:  form.presenting_complaint.trim(),
        danger_signs:          form.danger_signs,
        gestational_age_weeks: form.gestational_age_weeks ? Number(form.gestational_age_weeks) : null,
        gravida:               form.gravida  ? Number(form.gravida)  : null,
        parity:                form.parity   ? Number(form.parity)   : null,
        obstetric_history:     form.obstetric_history.trim() || undefined,
        membranes_status:      form.membranes_status,
        fetal_heart_rate:      form.fetal_heart_rate ? Number(form.fetal_heart_rate) : null,
        referring_facility:    form.referring_facility,
        ...(Object.keys(vital_signs).length > 0 && { vital_signs }),
      };

      const { data } = await casesAPI.createCase(payload);
      onCreated(data);
    } catch (err) {
      setApiError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView style={styles.modal} keyboardShouldPersistTaps="handled">
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>New Emergency Case</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalClose}>✕</Text>
          </TouchableOpacity>
        </View>

        {apiError ? <View style={styles.errorBanner}><Text style={styles.errorText}>{apiError}</Text></View> : null}

        {/* Patient Identity */}
        <Text style={styles.sectionLabel}>Patient Identity</Text>
        <View style={styles.halfRow}>
          <View style={{ flex: 1 }}><MField label="Patient Name *" value={form.patient_name} onChange={set('patient_name')} placeholder="Full name" /></View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}><MField label="Hospital ID" value={form.hospital_id} onChange={set('hospital_id')} placeholder="e.g. KBTH-001" /></View>
        </View>
        <View style={styles.halfRow}>
          <View style={{ flex: 1 }}><MField label="Phone" value={form.phone} onChange={set('phone')} placeholder="+233 XX XXX XXXX" keyboard="phone-pad" /></View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}><MField label="Age *" value={form.age} onChange={set('age')} placeholder="e.g. 28" keyboard="numeric" /></View>
        </View>

        {/* Patient Details */}
        <Text style={styles.sectionLabel}>Patient Details</Text>
        <View style={styles.halfRow}>
          <View style={{ flex: 1 }}><MField label="Town/District" value={form.patient_town} onChange={set('patient_town')} placeholder="e.g. Kumasi" /></View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}><MField label="ANC Visits" value={form.anc_visits} onChange={set('anc_visits')} placeholder="e.g. 3" keyboard="numeric" /></View>
        </View>

        <Text style={styles.mlabel}>Blood Group</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingRight: 8 }}>
            {BLOOD_GROUPS.map(g => (
              <TouchableOpacity
                key={g}
                onPress={() => set('blood_group')(g)}
                style={[styles.chipSmall, form.blood_group === g && styles.chipSmallActive]}
              >
                <Text style={[styles.chipSmallText, form.blood_group === g && styles.chipSmallTextActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Referring Facility */}
        <Text style={styles.sectionLabel}>Facility</Text>
        <Text style={styles.mlabel}>Referring Facility *</Text>
        <ScrollView style={{ maxHeight: 120, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10 }}>
          {facilities.length === 0
            ? <Text style={{ padding: 12, color: '#94a3b8', fontSize: 13 }}>Loading facilities…</Text>
            : facilities.map(f => (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => set('referring_facility')(f.id)}
                  style={[{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
                    form.referring_facility === f.id && { backgroundColor: '#f0fdf4' }]}
                >
                  <Text style={[{ fontSize: 13, color: '#374151' },
                    form.referring_facility === f.id && { color: '#16a34a', fontWeight: '600' }]}>
                    {f.name}{form.referring_facility === f.id ? ' ✓' : ''}
                  </Text>
                </TouchableOpacity>
              ))
          }
        </ScrollView>

        {/* Obstetric History */}
        <Text style={styles.sectionLabel}>Obstetric History</Text>
        <View style={styles.halfRow}>
          <View style={{ flex: 1 }}><MField label="Gestational Age (wks)" value={form.gestational_age_weeks} onChange={set('gestational_age_weeks')} placeholder="e.g. 36" keyboard="numeric" /></View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}><MField label="Gravida" value={form.gravida} onChange={set('gravida')} placeholder="e.g. 2" keyboard="numeric" /></View>
        </View>
        <MField label="Parity" value={form.parity} onChange={set('parity')} placeholder="e.g. 1" keyboard="numeric" />
        <MField label="Obstetric History" value={form.obstetric_history} onChange={set('obstetric_history')} placeholder="Prior complications or surgeries…" multiline />

        {/* Clinical Presentation */}
        <Text style={styles.sectionLabel}>Clinical Presentation</Text>
        <MField label="Presenting Complaint *" value={form.presenting_complaint} onChange={set('presenting_complaint')} placeholder="Describe the presenting complaint" multiline />

        <Text style={styles.mlabel}>Danger Signs</Text>
        <View style={styles.dangerGrid}>
          {ALL_DANGER_SIGNS.map(({ code, label }) => {
            const selected = form.danger_signs.includes(code);
            const color    = DANGER_COLORS[code] || '#64748b';
            return (
              <TouchableOpacity
                key={code}
                style={[styles.dangerChip, selected && { backgroundColor: color + '20', borderColor: color }]}
                onPress={() => toggleSign(code)}
              >
                <Text style={[styles.dangerChipText, selected && { color }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Vital Signs */}
        <Text style={styles.sectionLabel}>Vital Signs <Text style={{ textTransform: 'none', fontWeight: '400', fontSize: 11 }}>(record what's available)</Text></Text>
        <View style={styles.halfRow}>
          <View style={{ flex: 1 }}><MField label="Systolic BP (mmHg)" value={form.vital_signs.systolic_bp} onChange={setVital('systolic_bp')} placeholder="—" keyboard="numeric" /></View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}><MField label="Diastolic BP (mmHg)" value={form.vital_signs.diastolic_bp} onChange={setVital('diastolic_bp')} placeholder="—" keyboard="numeric" /></View>
        </View>
        <View style={styles.halfRow}>
          <View style={{ flex: 1 }}><MField label="Heart Rate (bpm)" value={form.vital_signs.heart_rate} onChange={setVital('heart_rate')} placeholder="—" keyboard="numeric" /></View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}><MField label="Resp. Rate (/min)" value={form.vital_signs.respiratory_rate} onChange={setVital('respiratory_rate')} placeholder="—" keyboard="numeric" /></View>
        </View>
        <View style={styles.halfRow}>
          <View style={{ flex: 1 }}><MField label="Temperature (°C)" value={form.vital_signs.temperature} onChange={setVital('temperature')} placeholder="—" keyboard="numeric" /></View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}><MField label="SpO₂ (%)" value={form.vital_signs.spo2} onChange={setVital('spo2')} placeholder="—" keyboard="numeric" /></View>
        </View>
        <View style={styles.halfRow}>
          <View style={{ flex: 1 }}><MField label="Fetal Heart Rate (bpm)" value={form.fetal_heart_rate} onChange={set('fetal_heart_rate')} placeholder="—" keyboard="numeric" /></View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.mlabel}>Membranes Status</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {['unknown', 'intact', 'ruptured'].map(s => (
                <TouchableOpacity key={s} onPress={() => set('membranes_status')(s)}
                  style={[styles.chipSmall, form.membranes_status === s && styles.chipSmallActive, { flex: 1, justifyContent: 'center' }]}>
                  <Text style={[styles.chipSmallText, form.membranes_status === s && styles.chipSmallTextActive, { textAlign: 'center', textTransform: 'capitalize' }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, loading && { opacity: 0.6 }]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Create Case</Text>}
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </Modal>
  );
}

function MField({ label, value, onChange, placeholder, keyboard, secure, multiline }) {
  return (
    <>
      <Text style={styles.mlabel}>{label}</Text>
      <TextInput
        style={[styles.minput, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboard || 'default'}
        secureTextEntry={secure}
        autoCapitalize="none"
        multiline={multiline}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#f8fafc' },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 56, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  title:      { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  addBtn:     { backgroundColor: '#16a34a', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 8, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14 },
  searchInput:{ flex: 1, fontSize: 15, color: '#0f172a', paddingVertical: 12 },
  clearBtn:   { padding: 4 },
  clearBtnText: { fontSize: 14, color: '#94a3b8' },
  list:       { padding: 16, paddingTop: 8, gap: 10 },
  loader:     { flex: 1, marginTop: 60 },
  card:       { backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardTop:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  name:       { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  facility:   { fontSize: 12, color: '#64748b', marginTop: 1 },
  dot:        { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  signsRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 6 },
  signBadge:  { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  signText:   { fontSize: 10, fontWeight: '700' },
  more:       { fontSize: 11, color: '#94a3b8', alignSelf: 'center' },
  complaint:  { fontSize: 12, color: '#475569' },
  empty:      { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
  modal:      { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  modalHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  modalClose: { fontSize: 22, color: '#64748b', padding: 4 },
  errorBanner:{ backgroundColor: '#fee2e2', borderRadius: 8, padding: 12, marginBottom: 12 },
  errorText:  { fontSize: 13, color: '#dc2626' },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 20, marginBottom: 8 },
  mlabel:     { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 14, marginBottom: 6 },
  minput:     { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0f172a', backgroundColor: '#fff' },
  halfRow:    { flexDirection: 'row' },
  dangerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  dangerChip: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff' },
  dangerChipText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  chipSmall: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff' },
  chipSmallActive: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  chipSmallText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  chipSmallTextActive: { color: '#16a34a', fontWeight: '700' },
  saveBtn:    { backgroundColor: '#16a34a', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  saveBtnText:{ color: '#fff', fontWeight: '700', fontSize: 15 },
});
