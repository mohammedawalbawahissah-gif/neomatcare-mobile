import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl,
  TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { casesAPI, referralsAPI, getErrorMessage } from '../../api/client';
import {
  Card, StatusBadge, Button, Spinner, Modal,
  Input, ErrorBanner, Divider, SectionHeader,
} from '../../components/ui';
import Colors from '../../constants/colors';
import { Typography, Spacing, Radius } from '../../constants/theme';

const CaseDetailScreen = ({ route, navigation }) => {
  const { caseId } = route.params;
  const [caseData, setCaseData]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState('');

  const [showVitalModal,    setShowVitalModal]    = useState(false);
  const [showNoteModal,     setShowNoteModal]     = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);

  const fetchCase = useCallback(async () => {
    try {
      setError('');
      const res = await casesAPI.getCase(caseId);
      setCaseData(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [caseId]);

  useEffect(() => { fetchCase(); }, [fetchCase]);

  const onRefresh = () => { setRefreshing(true); fetchCase(); };

  if (loading) return <Spinner fullScreen />;

  if (!caseData) {
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorBanner message={error || 'Case not found'} />
        <Button title="Go Back" onPress={() => navigation.goBack()} style={{ margin: Spacing[4] }} />
      </SafeAreaView>
    );
  }

  const patientName = caseData.patient_name ||
    `${caseData.patient?.first_name || ''} ${caseData.patient?.last_name || ''}`.trim() ||
    'Unknown Patient';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{patientName}</Text>
          <Text style={styles.headerSub}>Case #{caseData.id}</Text>
        </View>
        <StatusBadge status={caseData.status} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <ErrorBanner message={error} onDismiss={() => setError('')} />

        {/* Patient info */}
        <Card style={styles.section}>
          <SectionHeader title="Patient Information" />
          <InfoRow icon="person-outline"    label="Name"     value={patientName} />
          <InfoRow icon="calendar-outline"  label="DOB"      value={caseData.patient?.date_of_birth || caseData.date_of_birth} />
          <InfoRow icon="call-outline"      label="Phone"    value={caseData.patient?.phone || caseData.contact_phone} />
          <InfoRow icon="business-outline"  label="Facility" value={caseData.facility_name} />
          <InfoRow icon="time-outline"      label="Opened"   value={formatDate(caseData.created_at)} />
        </Card>

        {/* Diagnosis */}
        <Card style={styles.section}>
          <SectionHeader title="Clinical Information" />
          {caseData.diagnosis && (
            <>
              <Text style={styles.fieldLabel}>Diagnosis</Text>
              <Text style={styles.fieldValue}>{caseData.diagnosis}</Text>
              <Divider />
            </>
          )}
          {caseData.notes && (
            <>
              <Text style={styles.fieldLabel}>Notes</Text>
              <Text style={styles.fieldValue}>{caseData.notes}</Text>
            </>
          )}
        </Card>

        {/* Vital signs */}
        {caseData.vital_signs?.length > 0 && (
          <Card style={styles.section}>
            <SectionHeader title="Vital Signs" action={{ label: 'Add', onPress: () => setShowVitalModal(true) }} />
            {caseData.vital_signs.map((v, i) => (
              <View key={i} style={styles.vitalRow}>
                <Text style={styles.vitalDate}>{formatDate(v.recorded_at)}</Text>
                <View style={styles.vitalGrid}>
                  {v.blood_pressure  && <VitalChip label="BP"   value={v.blood_pressure}  />}
                  {v.heart_rate      && <VitalChip label="HR"   value={`${v.heart_rate} bpm`} />}
                  {v.temperature     && <VitalChip label="Temp" value={`${v.temperature}°C`} />}
                  {v.oxygen_saturation && <VitalChip label="SpO₂" value={`${v.oxygen_saturation}%`} />}
                </View>
                {i < caseData.vital_signs.length - 1 && <Divider />}
              </View>
            ))}
          </Card>
        )}

        {/* Case notes */}
        {caseData.case_notes?.length > 0 && (
          <Card style={styles.section}>
            <SectionHeader title="Case Notes" action={{ label: 'Add', onPress: () => setShowNoteModal(true) }} />
            {caseData.case_notes.map((n, i) => (
              <View key={i}>
                <View style={styles.noteRow}>
                  <Text style={styles.noteAuthor}>{n.author_name || 'Unknown'}</Text>
                  <Text style={styles.noteDate}>{formatDate(n.created_at)}</Text>
                </View>
                <Text style={styles.noteContent}>{n.content}</Text>
                {i < caseData.case_notes.length - 1 && <Divider />}
              </View>
            ))}
          </Card>
        )}

        {/* Referrals */}
        {caseData.referrals?.length > 0 && (
          <Card style={styles.section}>
            <SectionHeader title="Referrals" />
            {caseData.referrals.map((r, i) => (
              <View key={i} style={styles.referralRow}>
                <View style={styles.referralInfo}>
                  <Text style={styles.referralDest}>{r.to_facility_name || 'Facility'}</Text>
                  <Text style={styles.referralReason} numberOfLines={2}>{r.reason}</Text>
                </View>
                <StatusBadge status={r.status} />
              </View>
            ))}
          </Card>
        )}

        {/* Action buttons */}
        <View style={styles.actions}>
          {caseData.vital_signs?.length === 0 && (
            <Button title="Add Vital Signs" icon="pulse-outline" variant="outline" onPress={() => setShowVitalModal(true)} fullWidth style={styles.actionBtn} />
          )}
          <Button title="Add Note" icon="create-outline" variant="outline" onPress={() => setShowNoteModal(true)} fullWidth style={styles.actionBtn} />
          <Button title="Create Referral" icon="swap-horizontal-outline" onPress={() => setShowReferralModal(true)} fullWidth style={styles.actionBtn} />
        </View>
      </ScrollView>

      <AddVitalModal    visible={showVitalModal}    onClose={() => setShowVitalModal(false)}    caseId={caseId} onSaved={fetchCase} />
      <AddNoteModal     visible={showNoteModal}     onClose={() => setShowNoteModal(false)}     caseId={caseId} onSaved={fetchCase} />
      <CreateReferralModal visible={showReferralModal} onClose={() => setShowReferralModal(false)} caseId={caseId} onSaved={fetchCase} />
    </SafeAreaView>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const InfoRow = ({ icon, label, value }) => {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={15} color={Colors.textMuted} style={{ marginRight: 8 }} />
      <Text style={styles.infoLabel}>{label}: </Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
};

const VitalChip = ({ label, value }) => (
  <View style={styles.vitalChip}>
    <Text style={styles.vitalChipLabel}>{label}</Text>
    <Text style={styles.vitalChipValue}>{value}</Text>
  </View>
);

// ─── Add Vital Modal ──────────────────────────────────────────────────────────
const AddVitalModal = ({ visible, onClose, caseId, onSaved }) => {
  const [form, setForm]   = useState({ blood_pressure: '', heart_rate: '', temperature: '', oxygen_saturation: '' });
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const set = (f) => (v) => setForm((p) => ({ ...p, [f]: v }));

  const handleSave = async () => {
    setLoading(true);
    try {
      await casesAPI.addVitalSigns(caseId, form);
      setForm({ blood_pressure: '', heart_rate: '', temperature: '', oxygen_saturation: '' });
      onSaved(); onClose();
    } catch (err) { setApiError(getErrorMessage(err)); }
    finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Add Vital Signs">
      <ErrorBanner message={apiError} onDismiss={() => setApiError('')} />
      <Input label="Blood Pressure" placeholder="e.g. 120/80" value={form.blood_pressure} onChangeText={set('blood_pressure')} />
      <Input label="Heart Rate (bpm)" placeholder="e.g. 72" value={form.heart_rate} onChangeText={set('heart_rate')} keyboardType="numeric" />
      <Input label="Temperature (°C)" placeholder="e.g. 36.5" value={form.temperature} onChangeText={set('temperature')} keyboardType="decimal-pad" />
      <Input label="Oxygen Saturation (%)" placeholder="e.g. 98" value={form.oxygen_saturation} onChangeText={set('oxygen_saturation')} keyboardType="numeric" />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Cancel" variant="outline" onPress={onClose} style={{ flex: 1 }} />
        <Button title="Save" onPress={handleSave} loading={loading} style={{ flex: 1 }} />
      </View>
    </Modal>
  );
};

// ─── Add Note Modal ───────────────────────────────────────────────────────────
const AddNoteModal = ({ visible, onClose, caseId, onSaved }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleSave = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      await casesAPI.addNote(caseId, { content });
      setContent(''); onSaved(); onClose();
    } catch (err) { setApiError(getErrorMessage(err)); }
    finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Add Case Note">
      <ErrorBanner message={apiError} onDismiss={() => setApiError('')} />
      <Input label="Note" placeholder="Enter note..." value={content} onChangeText={setContent} multiline numberOfLines={4} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Cancel" variant="outline" onPress={onClose} style={{ flex: 1 }} />
        <Button title="Save" onPress={handleSave} loading={loading} style={{ flex: 1 }} />
      </View>
    </Modal>
  );
};

// ─── Create Referral Modal ────────────────────────────────────────────────────
const CreateReferralModal = ({ visible, onClose, caseId, onSaved }) => {
  const [form, setForm]   = useState({ to_facility: '', reason: '', priority: 'normal' });
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const set = (f) => (v) => setForm((p) => ({ ...p, [f]: v }));

  const handleCreate = async () => {
    if (!form.reason.trim()) return;
    setLoading(true);
    try {
      await referralsAPI.createReferral({ ...form, case: caseId });
      setForm({ to_facility: '', reason: '', priority: 'normal' });
      onSaved(); onClose();
    } catch (err) { setApiError(getErrorMessage(err)); }
    finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Create Referral">
      <ErrorBanner message={apiError} onDismiss={() => setApiError('')} />
      <Input label="To Facility" placeholder="Facility name or ID" value={form.to_facility} onChangeText={set('to_facility')} icon="business-outline" />
      <Input label="Reason" placeholder="Reason for referral" value={form.reason} onChangeText={set('reason')} multiline numberOfLines={3} required />
      <Select
        label="Priority"
        value={form.priority}
        onValueChange={set('priority')}
        options={[{ value: 'normal', label: 'Normal' }, { value: 'urgent', label: 'Urgent' }, { value: 'emergency', label: 'Emergency' }]}
      />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Cancel" variant="outline" onPress={onClose} style={{ flex: 1 }} />
        <Button title="Create" onPress={handleCreate} loading={loading} style={{ flex: 1 }} />
      </View>
    </Modal>
  );
};

const formatDate = (dt) => {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing[4], paddingBottom: Spacing[10] },

  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:     { marginRight: Spacing[3] },
  headerInfo:  { flex: 1 },
  headerTitle: { fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.textPrimary },
  headerSub:   { fontSize: Typography.xs, color: Colors.textSecondary },

  section:     { marginBottom: Spacing[3] },

  infoRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  infoLabel:   { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
  infoValue:   { fontSize: Typography.sm, color: Colors.textPrimary, flex: 1 },

  fieldLabel:  { fontSize: Typography.xs, color: Colors.textMuted, fontWeight: Typography.medium, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  fieldValue:  { fontSize: Typography.base, color: Colors.textPrimary, lineHeight: 22, marginBottom: Spacing[3] },

  vitalRow:    { marginBottom: Spacing[2] },
  vitalDate:   { fontSize: Typography.xs, color: Colors.textMuted, marginBottom: Spacing[2] },
  vitalGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  vitalChip:   { backgroundColor: Colors.primaryLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.md, alignItems: 'center' },
  vitalChipLabel: { fontSize: Typography.xs, color: Colors.primaryDark, fontWeight: Typography.semibold },
  vitalChipValue: { fontSize: Typography.sm, color: Colors.textPrimary },

  noteRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  noteAuthor:  { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textPrimary },
  noteDate:    { fontSize: Typography.xs, color: Colors.textMuted },
  noteContent: { fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing[2] },

  referralRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing[2] },
  referralInfo: { flex: 1, marginRight: Spacing[3] },
  referralDest: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textPrimary },
  referralReason: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },

  actions:    { gap: Spacing[2], marginTop: Spacing[2] },
  actionBtn:  {},
});

export default CaseDetailScreen;
