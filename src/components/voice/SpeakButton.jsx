import React, { useState } from 'react';
import { TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { speak, stopSpeaking, getVoiceLanguage, LANGUAGES } from '../../services/voice';
import Colors from '../../constants/colors';

/** Mirrors src/components/voice/SpeakButton.jsx on web. */
export default function SpeakButton({ text, style, iconColor = Colors.textSecondary }) {
  const [state, setState] = useState('idle'); // idle | loading | playing
  const lang = getVoiceLanguage();
  const langInfo = LANGUAGES.find((l) => l.code === lang);

  if (!langInfo?.readAloud || !text?.trim()) return null;

  const handlePress = async () => {
    if (state === 'playing') { stopSpeaking(); setState('idle'); return; }
    setState('loading');
    try {
      const playPromise = speak(text, lang);
      setState('playing');
      await playPromise;
    } catch {
      // read-aloud is a convenience, not critical path — fail quietly
    } finally {
      setState('idle');
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} style={[styles.btn, style]}>
      {state === 'loading' ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <Ionicons name={state === 'playing' ? 'volume-mute-outline' : 'volume-medium-outline'} size={16} color={iconColor} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.gray100,
  },
});
