/**
 * screens/health-worker/CaseDetailScreen.jsx
 * Original NeoMatCare case detail UI — restored with new CaseDetailScreen logic.
 * All modals (vitals, notes, referral+transport) preserved from revamp.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity, Alert,
  Modal, TextInput, RefreshControl,
} from 'react-native';
import { casesAPI, referralsAPI, facilitiesAPI, transportAPI, getErrorMessage } from '../../api/client';

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

const VEHICLE_EMOJI = { AMBULANCE: '🚑', MOTORCYCLE: '🏍️', CAR: '🚗', VAN: '🚐' };

const formatDate = (dt) => {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

export default function CaseDetailScreen({ route, navigation }) {
  const { caseId } = route.params;
  const [caseData,   setCaseData]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showVitalModal,    setShowVitalModal]    = useState(false);
  const [showNoteModal,     setShowNoteModal]     = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);

  const fetchCase = useCallback(async () => {
    try {
      const res = await casesAPI.getCase(caseId);
      setCaseData(res.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [caseId]);

  useEffect(() => { fetchCase(); }, [fetchCase]);

  if (loading) return <ActivityIndicator style={styles.loader} color="#16a34a" />;
  if (!caseData) return <Text style={styles.error}>Case not found.</Text>;

  const p      = caseData.patient || {};
  const vs     = caseData.vital_signs || {};
  const signs  = caseData.danger_signs || [];
  const name   = p.patient_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown Patient';

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCase(); }} tintColor="#16a34a" />}
    >
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{name}</Text>
      <Text style={styles.caseId}>Case #{String(caseData.id).slice(0, 8).toUpperCase()}</Text>

      {/* Patient */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Patient</Text>
        <Row label="Name"     value={p.patient_name || name} />
        <Row label="Age"      value={p.age ? `${p.age} years` : null} />
        <Row label="Phone"    value={p.patient_phone_number} />
        <Row label="Blood"    value={p.blood_group} />
        <Row label="ANC Visits" value={p.anc_visits != null ? String(p.anc_visits) : null} />
        <Row label="Facility" value={caseData.referring_facility_name} />
        <Row label="Recorded" value={formatDate(caseData.created_at)} />
      </View>

      {/* Obstetrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Obstetric History</Text>
        <Row label="Gestational Age" value={caseData.gestational_age_weeks ? `${caseData.gestational_age_weeks} weeks` : null} />
        <Row label="Gravida"         value={caseData.gravida != null ? String(caseData.gravida) : null} />
        <Row label="Parity"          value={caseData.parity  != null ? String(caseData.parity)  : null} />
        <Row label="Membranes"       value={caseData.membranes_status} />
        <Row label="Fetal HR"        value={caseData.fetal_heart_rate ? `${caseData.fetal_heart_rate} bpm` : null} />
      </View>

      {/* Clinical */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Clinical Presentation</Text>
        <Text style={styles.notes}>{caseData.presenting_complaint || '—'}</Text>
        {signs.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Danger Signs</Text>
            <View style={styles.signsRow}>
              {signs.map(code => {
                const entry = ALL_DANGER_SIGNS.find(d => d.code === code);
                return (
                  <View key={code} style={styles.dangerBadge}>
                    <Text style={styles.dangerBadgeText}>{entry?.label || code.replace(/_/g, ' ')}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </View>

      {/* Vitals */}
      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Vital Signs</Text>
          <TouchableOpacity onPress={() => setShowVitalModal(true)}>
            <Text style={styles.sectionAction}>Update</Text>
          </TouchableOpacity>
        </View>
        {Object.values(vs).some(v => v !== '' && v != null) ? (
          <View style={styles.vitalGrid}>
            <VitalChip label="Systolic BP"  value={vs.systolic_bp}      unit="mmHg" />
            <VitalChip label="Diastolic BP" value={vs.diastolic_bp}     unit="mmHg" />
            <VitalChip label="Heart Rate"   value={vs.heart_rate}       unit="bpm" />
            <VitalChip label="Resp. Rate"   value={vs.respiratory_rate} unit="/min" />
            <VitalChip label="Temperature"  value={vs.temperature}      unit="°C" />
            <VitalChip label="SpO₂"         value={vs.spo2}             unit="%" />
          </View>
        ) : (
          <Text style={styles.emptyMuted}>No vitals recorded yet.</Text>
        )}
      </View>

      {/* Clinical Notes */}
      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Clinical Notes</Text>
          <TouchableOpacity onPress={() => setShowNoteModal(true)}>
            <Text style={styles.sectionAction}>Add</Text>
          </TouchableOpacity>
        </View>
        {caseData.triage_notes?.length > 0 ? (
          caseData.triage_notes.map((n, i) => (
            <View key={n.id || i} style={styles.noteItem}>
              <View style={styles.noteHeader}>
                <Text style={styles.noteAuthor}>{n.created_by_name || 'Unknown'}</Text>
                <Text style={styles.noteDate}>{formatDate(n.created_at)}</Text>
              </View>
              <Text style={styles.noteContent}>{n.note}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyMuted}>No clinical notes yet.</Text>
        )}
      </View>

      {/* Referrals */}
      {caseData.referrals?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Referrals</Text>
          {caseData.referrals.map((r, i) => (
            <View key={r.id || i} style={styles.referralRow}>
              <Text style={styles.referralFacility} numberOfLines={1}>
                {r.referring_facility_name} → {r.receiving_facility_name}
              </Text>
              <View style={[styles.statusPill, { backgroundColor: STATUS_BG[r.status] || '#f1f5f9' }]}>
                <Text style={[styles.statusPillText, { color: STATUS_TEXT[r.status] || '#64748b' }]}>{r.status}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowNoteModal(true)}>
          <Text style={styles.outlineBtnText}>Add Clinical Note</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowReferralModal(true)}>
          <Text style={styles.primaryBtnText}>Create Referral</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />

      <AddVitalModal
        visible={showVitalModal}
        onClose={() => setShowVitalModal(false)}
        caseId={caseId}
        currentVitals={vs}
        onSaved={fetchCase}
      />
      <AddNoteModal
        visible={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        caseId={caseId}
        onSaved={fetchCase}
      />
      <CreateReferralModal
        visible={showReferralModal}
        onClose={() => setShowReferralModal(false)}
        caseData={caseData}
        onSaved={fetchCase}
      />
    </ScrollView>
  );
}

const STATUS_BG   = { PENDING: '#fef3c7', ACCEPTED: '#dcfce7', IN_TRANSIT: '#dbeafe', COMPLETED: '#d1fae5', CANCELLED: '#fee2e2' };
const STATUS_TEXT = { PENDING: '#d97706', ACCEPTED: '#16a34a', IN_TRANSIT: '#2563eb', COMPLETED: '#059669', CANCELLED: '#dc2626' };

function Row({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{String(value)}</Text>
    </View>
  );
}

function VitalChip({ label, value, unit }) {
  if (value === '' || value == null) return null;
  return (
    <View style={styles.vitalChip}>
      <Text style={styles.vitalLabel}>{label}</Text>
      <Text style={styles.vitalValue}>{value} <Text style={styles.vitalUnit}>{unit}</Text></Text>
    </View>
  );
}

// ── Add Vitals Modal ───────────────────────────────────────────────────────────
function AddVitalModal({ visible, onClose, caseId, currentVitals, onSaved }) {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setForm({
        systolic_bp:      String(currentVitals?.systolic_bp      ?? ''),
        diastolic_bp:     String(currentVitals?.diastolic_bp     ?? ''),
        heart_rate:       String(currentVitals?.heart_rate       ?? ''),
        respiratory_rate: String(currentVitals?.respiratory_rate ?? ''),
        temperature:      String(currentVitals?.temperature      ?? ''),
        spo2:             String(currentVitals?.spo2             ?? ''),
      });
      setError('');
    }
  }, [visible, currentVitals]);

  const set = (f) => (v) => setForm(p => ({ ...p, [f]: v }));

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {};
      Object.entries(form).forEach(([k, v]) => { if (v !== '') payload[k] = Number(v); });
      await casesAPI.addVitalSigns(caseId, payload);
      onSaved(); onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView style={styles.modal} keyboardShouldPersistTaps="handled">
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Update Vital Signs</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
        </View>
        {error ? <View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View> : null}
        <View style={styles.halfRow}>
          <View style={{ flex: 1 }}><MField label="Systolic BP (mmHg)"  value={form.systolic_bp}      onChange={set('systolic_bp')}      placeholder="e.g. 120" keyboard="numeric" /></View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}><MField label="Diastolic BP (mmHg)" value={form.diastolic_bp}     onChange={set('diastolic_bp')}     placeholder="e.g. 80"  keyboard="numeric" /></View>
        </View>
        <View style={styles.halfRow}>
          <View style={{ flex: 1 }}><MField label="Heart Rate (bpm)"    value={form.heart_rate}       onChange={set('heart_rate')}       placeholder="e.g. 88"  keyboard="numeric" /></View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}><MField label="Resp. Rate (/min)"   value={form.respiratory_rate} onChange={set('respiratory_rate')} placeholder="e.g. 18"  keyboard="numeric" /></View>
        </View>
        <View style={styles.halfRow}>
          <View style={{ flex: 1 }}><MField label="Temperature (°C)"    value={form.temperature}      onChange={set('temperature')}      placeholder="e.g. 37.2" keyboard="decimal-pad" /></View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}><MField label="SpO₂ (%)"            value={form.spo2}             onChange={set('spo2')}             placeholder="e.g. 98"  keyboard="numeric" /></View>
        </View>
        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.outlineBtn, { flex: 1 }]} onPress={onClose}><Text style={styles.outlineBtnText}>Cancel</Text></TouchableOpacity>
          <View style={{ width: 12 }} />
          <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }, loading && { opacity: 0.6 }]} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryBtnText}>Save</Text>}
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </Modal>
  );
}

// ── Add Note Modal ─────────────────────────────────────────────────────────────
function AddNoteModal({ visible, onClose, caseId, onSaved }) {
  const [note, setNote]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!note.trim()) return;
    setLoading(true);
    try {
      await casesAPI.addNote(caseId, { note });
      setNote(''); onSaved(); onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add Clinical Note</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
        </View>
        {error ? <View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View> : null}
        <Text style={styles.mlabel}>Note</Text>
        <TextInput
          style={[styles.minput, { height: 120, textAlignVertical: 'top' }]}
          value={note}
          onChangeText={setNote}
          placeholder="Enter clinical note…"
          placeholderTextColor="#94a3b8"
          multiline
        />
        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.outlineBtn, { flex: 1 }]} onPress={onClose}><Text style={styles.outlineBtnText}>Cancel</Text></TouchableOpacity>
          <View style={{ width: 12 }} />
          <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }, loading && { opacity: 0.6 }]} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryBtnText}>Save</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Create Referral Modal (AI suggestion + manual + transport) ─────────────────
function CreateReferralModal({ visible, onClose, caseData, onSaved }) {
  const [step, setStep]               = useState('select_mode');
  const [suggestion, setSuggestion]   = useState(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError]     = useState('');
  const [facilities, setFacilities]         = useState([]);
  const [facilitiesLoading, setFacilitiesLoading] = useState(false);
  const [facilitySearch, setFacilitySearch] = useState('');
  const [selected, setSelected]             = useState(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [creating, setCreating]             = useState(false);
  const [saveError, setSaveError]           = useState('');
  const [createdReferral, setCreatedReferral] = useState(null);
  const [vehicles, setVehicles]             = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [transportNotes, setTransportNotes] = useState('');
  const [assigningTransport, setAssigningTransport] = useState(false);

  useEffect(() => {
    if (!visible) {
      setStep('select_mode'); setSuggestion(null); setSuggestError(''); setSuggestLoading(false);
      setFacilities([]); setFacilitySearch(''); setSelected(null);
      setOverrideReason(''); setSaveError(''); setCreatedReferral(null);
      setVehicles([]); setSelectedVehicle(null); setTransportNotes('');
    }
  }, [visible]);

  const runSuggestion = async () => {
    setSuggestLoading(true); setSuggestError('');
    try {
      const { data } = await referralsAPI.suggest(caseData.id);
      setSuggestion(data);
      if (data.recommended_facility)
        setSelected({ id: data.recommended_facility.id, name: data.recommended_facility.name });
    } catch {
      setSuggestError('Could not fetch AI suggestions. Select manually.');
    } finally { setSuggestLoading(false); setStep('suggestion'); }
  };

  const loadFacilities = async () => {
    setStep('manual');
    if (facilities.length > 0) return;
    setFacilitiesLoading(true);
    try {
      const { data } = await facilitiesAPI.getFacilities();
      setFacilities(Array.isArray(data) ? data : data.results || []);
    } catch {}
    finally { setFacilitiesLoading(false); }
  };

  const engineRecId = suggestion?.recommended_facility?.id;
  const isOverride  = engineRecId && selected?.id && selected.id !== engineRecId;

  const handleCreate = async () => {
    if (!selected) return;
    if (isOverride && !overrideReason.trim()) {
      Alert.alert('Required', 'Please provide a reason for overriding the recommendation.'); return;
    }
    setCreating(true); setSaveError('');
    try {
      const { data } = await referralsAPI.createReferral({
        emergency_case_id:     caseData.id,
        receiving_facility_id: selected.id,
        ...(suggestion?.engine_version && { engine_version: suggestion.engine_version }),
        ...(engineRecId                && { engine_recommendation_id: engineRecId }),
        ...(isOverride                 && { override_reason: overrideReason }),
      });
      setCreatedReferral(data);
      setStep('transport');
      setVehiclesLoading(true);
      transportAPI.getAvailableVehicles()
        .then(({ data: v }) => setVehicles(Array.isArray(v) ? v : v.results || []))
        .catch(() => {})
        .finally(() => setVehiclesLoading(false));
    } catch (err) {
      setSaveError(getErrorMessage(err));
    } finally { setCreating(false); }
  };

  const handleAssignTransport = async () => {
    if (!selectedVehicle || !createdReferral) return;
    setAssigningTransport(true);
    try {
      await transportAPI.createTransportRequest({
        vehicle: selectedVehicle.id, referral: createdReferral.id,
        ...(transportNotes && { notes: transportNotes }),
      });
      onSaved(); onClose();
    } catch { onSaved(); onClose(); }
    finally { setAssigningTransport(false); }
  };

  const filteredFacilities = facilities.filter(f =>
    f.name?.toLowerCase().includes(facilitySearch.toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView style={styles.modal} keyboardShouldPersistTaps="handled">
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Create Referral</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
        </View>

        {/* Mode selection */}
        {step === 'select_mode' && (
          <View style={{ gap: 12 }}>
            <Text style={styles.modeHint}>How would you like to select the receiving facility?</Text>
            <TouchableOpacity style={styles.modeCardPrimary} onPress={runSuggestion} disabled={suggestLoading}>
              <View style={styles.modeIcon}>
                {suggestLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ fontSize: 18 }}>🤖</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modeCardTitle}>AI Facility Suggestion</Text>
                <Text style={styles.modeCardSub}>Engine ranks by danger signs, capacity & distance</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modeCardSecondary} onPress={loadFacilities} disabled={facilitiesLoading}>
              <View style={styles.modeIconGray}>
                {facilitiesLoading ? <ActivityIndicator color="#64748b" size="small" /> : <Text style={{ fontSize: 18 }}>📍</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modeCardTitleGray}>Manual Selection</Text>
                <Text style={styles.modeCardSub}>Browse and pick any active facility</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* AI suggestion results */}
        {step === 'suggestion' && (() => {
          const all = [suggestion?.recommended_facility, ...(suggestion?.alternatives || [])].filter(Boolean);
          return (
            <View>
              {suggestError ? <View style={styles.errorBanner}><Text style={styles.errorText}>{suggestError}</Text></View> : null}
              {all.map((f, i) => {
                const isSel = selected?.id === f.id;
                return (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.facilityCard, isSel && styles.facilityCardSelected]}
                    onPress={() => setSelected({ id: f.id, name: f.name })}
                  >
                    <View style={[styles.rankBadge, i === 0 && styles.rankBadgeTop]}>
                      <Text style={[styles.rankText, i === 0 && { color: '#fff' }]}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.facilityName}>{f.name}</Text>
                        {i === 0 && <View style={styles.recBadge}><Text style={styles.recBadgeText}>Recommended</Text></View>}
                      </View>
                      <Text style={styles.facilityMeta}>
                        {f.distance_km != null ? `${f.distance_km?.toFixed(1)} km` : ''}
                        {f.level ? ` · Level ${f.level}` : ''}
                      </Text>
                    </View>
                    {isSel && <Text style={{ fontSize: 18, color: '#16a34a' }}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity style={styles.switchModeBtn} onPress={loadFacilities}>
                <Text style={styles.switchModeBtnText}>Select manually instead →</Text>
              </TouchableOpacity>
              <ReferralConfirmFooter
                selected={selected} isOverride={isOverride}
                overrideReason={overrideReason} setOverrideReason={setOverrideReason}
                saveError={saveError} setSaveError={setSaveError}
                creating={creating} handleCreate={handleCreate} onClose={onClose}
              />
            </View>
          );
        })()}

        {/* Manual picker */}
        {step === 'manual' && (
          <View>
            <TextInput
              style={styles.facilitySearch}
              placeholder="Search facilities…"
              value={facilitySearch}
              onChangeText={setFacilitySearch}
              placeholderTextColor="#94a3b8"
            />
            {facilitiesLoading ? (
              <ActivityIndicator color="#16a34a" style={{ marginVertical: 20 }} />
            ) : filteredFacilities.map(f => {
              const isSel = selected?.id === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.facilityCard, isSel && styles.facilityCardSelected]}
                  onPress={() => setSelected({ id: f.id, name: f.name })}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.facilityName}>{f.name}</Text>
                    {f.level && <Text style={styles.facilityMeta}>Level {f.level}</Text>}
                  </View>
                  {isSel && <Text style={{ fontSize: 18, color: '#16a34a' }}>✓</Text>}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.switchModeBtn} onPress={() => { setStep('select_mode'); setSuggestion(null); }}>
              <Text style={styles.switchModeBtnText}>Try AI suggestion →</Text>
            </TouchableOpacity>
            <ReferralConfirmFooter
              selected={selected} isOverride={isOverride}
              overrideReason={overrideReason} setOverrideReason={setOverrideReason}
              saveError={saveError} setSaveError={setSaveError}
              creating={creating} handleCreate={handleCreate} onClose={onClose}
            />
          </View>
        )}

        {/* Transport step */}
        {step === 'transport' && (
          <View>
            <View style={styles.successBanner}>
              <Text style={styles.successTitle}>✓ Referral created</Text>
              <Text style={styles.successSub}>To: {createdReferral?.receiving_facility_name}</Text>
            </View>
            <Text style={styles.mlabel}>Assign Transport (optional)</Text>
            {vehiclesLoading ? (
              <ActivityIndicator color="#16a34a" style={{ marginVertical: 20 }} />
            ) : vehicles.length === 0 ? (
              <View style={styles.noVehicles}>
                <Text style={styles.noVehiclesText}>No vehicles available. Assign transport later from the referral.</Text>
              </View>
            ) : vehicles.map(v => {
              const isSel = selectedVehicle?.id === v.id;
              const emoji = VEHICLE_EMOJI[v.vehicle_type] || '🚑';
              return (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.facilityCard, isSel && styles.facilityCardSelected]}
                  onPress={() => setSelectedVehicle(isSel ? null : v)}
                >
                  <Text style={{ fontSize: 22, marginRight: 12 }}>{emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.facilityName}>{v.registration}</Text>
                    <Text style={styles.facilityMeta}>{v.make} {v.model} · {v.vehicle_type?.replace(/_/g, ' ')}{v.driver_name ? ` · ${v.driver_name}` : ''}</Text>
                  </View>
                  {isSel && <Text style={{ fontSize: 18, color: '#16a34a' }}>✓</Text>}
                </TouchableOpacity>
              );
            })}
            {selectedVehicle && (
              <>
                <Text style={styles.mlabel}>Transport Notes (optional)</Text>
                <TextInput
                  style={[styles.minput, { height: 60, textAlignVertical: 'top' }]}
                  value={transportNotes}
                  onChangeText={setTransportNotes}
                  placeholder="Special instructions…"
                  placeholderTextColor="#94a3b8"
                  multiline
                />
              </>
            )}
            <View style={[styles.btnRow, { marginTop: 20 }]}>
              <TouchableOpacity style={[styles.outlineBtn, { flex: 1 }]} onPress={() => { onSaved(); onClose(); }}>
                <Text style={styles.outlineBtnText}>Skip for now</Text>
              </TouchableOpacity>
              <View style={{ width: 12 }} />
              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 1 }, (!selectedVehicle || assigningTransport) && { opacity: 0.6 }]}
                onPress={handleAssignTransport}
                disabled={!selectedVehicle || assigningTransport}
              >
                {assigningTransport ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryBtnText}>Assign & Finish</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </Modal>
  );
}

function ReferralConfirmFooter({ selected, isOverride, overrideReason, setOverrideReason, saveError, setSaveError, creating, handleCreate, onClose }) {
  return (
    <View style={styles.confirmFooter}>
      {selected && (
        <View style={styles.selectedFacilityBox}>
          <Text style={styles.selectedFacilityLabel}>Selected facility</Text>
          <Text style={styles.selectedFacilityName}>{selected.name}</Text>
          {isOverride && <Text style={styles.overrideWarning}>⚠ Overriding recommendation — reason required</Text>}
        </View>
      )}
      {isOverride && (
        <>
          <Text style={styles.mlabel}>Override Reason *</Text>
          <TextInput
            style={[styles.minput, { height: 60, textAlignVertical: 'top' }]}
            value={overrideReason}
            onChangeText={setOverrideReason}
            placeholder="Explain why you're overriding…"
            placeholderTextColor="#94a3b8"
            multiline
          />
        </>
      )}
      {saveError ? <View style={styles.errorBanner}><Text style={styles.errorText}>{saveError}</Text></View> : null}
      <View style={styles.btnRow}>
        <TouchableOpacity style={[styles.outlineBtn, { flex: 1 }]} onPress={onClose}>
          <Text style={styles.outlineBtnText}>Cancel</Text>
        </TouchableOpacity>
        <View style={{ width: 12 }} />
        <TouchableOpacity
          style={[styles.primaryBtn, { flex: 1 }, (!selected || creating) && { opacity: 0.6 }]}
          onPress={handleCreate}
          disabled={!selected || creating}
        >
          {creating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryBtnText}>Create Referral</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MField({ label, value, onChange, placeholder, keyboard }) {
  return (
    <>
      <Text style={styles.mlabel}>{label}</Text>
      <TextInput
        style={styles.minput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboard || 'default'}
        autoCapitalize="none"
      />
    </>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  loader:      { flex: 1, marginTop: 80 },
  error:       { textAlign: 'center', marginTop: 80, color: '#dc2626' },
  back:        { marginTop: 48, marginBottom: 8 },
  backText:    { color: '#16a34a', fontWeight: '600', fontSize: 15 },
  title:       { fontSize: 22, fontWeight: '700', color: '#0f172a', marginTop: 8 },
  caseId:      { fontSize: 13, color: '#94a3b8', marginBottom: 20 },
  section:     { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  sectionRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle:{ fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionAction:{ fontSize: 12, color: '#16a34a', fontWeight: '700' },
  row:         { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  rowLabel:    { fontSize: 13, color: '#64748b', fontWeight: '500' },
  rowValue:    { fontSize: 13, color: '#0f172a', fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  notes:       { fontSize: 13, color: '#374151', lineHeight: 20 },
  signsRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  dangerBadge: { backgroundColor: '#fee2e2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  dangerBadgeText: { fontSize: 11, color: '#dc2626', fontWeight: '700' },
  vitalGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vitalChip:   { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, minWidth: '30%' },
  vitalLabel:  { fontSize: 11, color: '#166534', fontWeight: '600' },
  vitalValue:  { fontSize: 13, color: '#0f172a' },
  vitalUnit:   { fontSize: 11, color: '#64748b' },
  noteItem:    { marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  noteHeader:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  noteAuthor:  { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  noteDate:    { fontSize: 11, color: '#94a3b8' },
  noteContent: { fontSize: 13, color: '#374151', lineHeight: 20 },
  referralRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  referralFacility: { fontSize: 13, color: '#0f172a', fontWeight: '500', flex: 1, marginRight: 8 },
  statusPill:  { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText: { fontSize: 10, fontWeight: '700' },
  emptyMuted:  { fontSize: 13, color: '#94a3b8', textAlign: 'center', paddingVertical: 12 },
  actions:     { gap: 10, marginBottom: 16 },
  primaryBtn:  { backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  outlineBtn:  { borderWidth: 1.5, borderColor: '#16a34a', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  outlineBtnText: { color: '#16a34a', fontWeight: '700', fontSize: 14 },
  btnRow:      { flexDirection: 'row' },
  halfRow:     { flexDirection: 'row', marginBottom: 4 },
  modal:       { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 20 },
  modalTitle:  { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  modalClose:  { fontSize: 22, color: '#64748b', padding: 4 },
  mlabel:      { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 14, marginBottom: 6 },
  minput:      { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0f172a', backgroundColor: '#fff' },
  errorBanner: { backgroundColor: '#fee2e2', borderRadius: 8, padding: 12, marginBottom: 12 },
  errorText:   { fontSize: 13, color: '#dc2626' },
  modeHint:    { fontSize: 13, color: '#64748b', marginBottom: 4 },
  modeCardPrimary:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, borderWidth: 2, borderColor: '#dcfce7', backgroundColor: '#f0fdf4' },
  modeCardSecondary:{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, borderWidth: 2, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  modeIcon:    { width: 40, height: 40, borderRadius: 10, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' },
  modeIconGray:{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  modeCardTitle:    { fontSize: 13, fontWeight: '700', color: '#166534' },
  modeCardTitleGray:{ fontSize: 13, fontWeight: '700', color: '#0f172a' },
  modeCardSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  facilityCard:         { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 2, borderColor: '#e2e8f0', backgroundColor: '#fff', marginBottom: 8 },
  facilityCardSelected: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  facilityName:  { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  facilityMeta:  { fontSize: 12, color: '#64748b', marginTop: 2 },
  facilitySearch:{ borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#0f172a', backgroundColor: '#fff', marginBottom: 12 },
  rankBadge:     { width: 22, height: 22, borderRadius: 11, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rankBadgeTop:  { backgroundColor: '#16a34a' },
  rankText:      { fontSize: 11, fontWeight: '700', color: '#64748b' },
  recBadge:      { backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, marginLeft: 8 },
  recBadgeText:  { fontSize: 10, color: '#166534', fontWeight: '700' },
  switchModeBtn: { alignItems: 'center', paddingVertical: 12 },
  switchModeBtnText: { fontSize: 12, color: '#16a34a', fontWeight: '600' },
  confirmFooter: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16, marginTop: 8 },
  selectedFacilityBox: { backgroundColor: '#f0fdf4', borderRadius: 10, padding: 14, marginBottom: 12 },
  selectedFacilityLabel:{ fontSize: 11, color: '#64748b', marginBottom: 2 },
  selectedFacilityName: { fontSize: 14, fontWeight: '700', color: '#166534' },
  overrideWarning:      { fontSize: 11, color: '#d97706', marginTop: 4 },
  successBanner: { backgroundColor: '#dcfce7', borderRadius: 12, padding: 16, marginBottom: 16 },
  successTitle:  { fontSize: 14, fontWeight: '700', color: '#166534' },
  successSub:    { fontSize: 12, color: '#16a34a', marginTop: 2 },
  noVehicles:    { backgroundColor: '#f1f5f9', borderRadius: 10, padding: 16, marginBottom: 8 },
  noVehiclesText:{ fontSize: 13, color: '#64748b', textAlign: 'center' },
});
