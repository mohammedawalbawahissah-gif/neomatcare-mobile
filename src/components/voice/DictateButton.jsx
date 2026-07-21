import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { startListening, getVoiceLanguage, LANGUAGES } from '../../services/voice';
import Colors from '../../constants/colors';
import { Typography } from '../../constants/theme';

/**
 * Mirrors src/components/voice/DictateButton.jsx on web. Drop next to any
 * Input. English streams live; local languages are record-then-transcribe,
 * so the button shows a distinct "Transcribing…" state for those rather
 * than pretending it's live too.
 */
export default function DictateButton({ onResult, style }) {
  const [state, setState] = useState('idle'); // idle | listening | transcribing
  const [error, setError] = useState('');
  const stopRef = useRef(null);
  const lang = getVoiceLanguage();
  const langInfo = LANGUAGES.find((l) => l.code === lang);

  if (!langInfo?.dictation) return null;

  const start = () => {
    setError('');
    setState('listening');
    stopRef.current = startListening(lang, {
      onResult: (text) => onResult(text),
      onError: (err) => { setError(err.message); setState('idle'); },
      onEnd: () => setState((s) => (s === 'listening' ? 'idle' : s)),
    });
  };

  const stop = () => {
    if (lang !== 'en') setState('transcribing');
    stopRef.current?.();
  };

  return (
    <View style={[styles.row, style]}>
      <TouchableOpacity
        onPress={state === 'idle' ? start : state === 'listening' ? stop : undefined}
        disabled={state === 'transcribing'}
        style={[
          styles.btn,
          state === 'listening' && styles.btnListening,
          state === 'transcribing' && styles.btnDisabled,
        ]}
      >
        {state === 'transcribing' ? (
          <ActivityIndicator size="small" color={Colors.gray400} />
        ) : (
          <Ionicons
            name={state === 'listening' ? 'stop' : 'mic-outline'}
            size={14}
            color={state === 'listening' ? Colors.white : Colors.primary}
          />
        )}
      </TouchableOpacity>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btn: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  btnListening: { backgroundColor: Colors.dangerDark },
  btnDisabled: { backgroundColor: Colors.gray100 },
  error: { fontSize: Typography.xs, color: Colors.dangerDark, flexShrink: 1 },
});
