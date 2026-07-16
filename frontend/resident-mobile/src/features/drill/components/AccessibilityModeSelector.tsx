import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { AccessibilityMode } from '../types';

interface Props {
  selected: AccessibilityMode;
  onChange: (mode: AccessibilityMode) => void;
}

const MODES: { mode: AccessibilityMode; label: string; desc: string }[] = [
  {
    mode: 'VISUAL_ONLY',
    label: 'Visual Saja',
    desc: 'Panah dan instruksi teks',
  },
  {
    mode: 'VISUAL_AND_AUDIO',
    label: 'Visual + Audio',
    desc: 'Panah, teks, dan panduan suara',
  },
  {
    mode: 'AUDIO_PRIMARY',
    label: 'Audio Utama',
    desc: 'Panduan suara tanpa visual warna',
  },
];

export default function AccessibilityModeSelector({ selected, onChange }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mode Panduan</Text>
      <View style={styles.options}>
        {MODES.map(({ mode, label, desc }) => (
          <TouchableOpacity
            key={mode}
            style={[styles.option, selected === mode && styles.optionSelected]}
            onPress={() => onChange(mode)}
            accessible
            accessibilityRole="radio"
            accessibilityState={{ selected: selected === mode }}
            accessibilityLabel={`${label}: ${desc}`}
          >
            <View style={[styles.radio, selected === mode && styles.radioSelected]}>
              {selected === mode && <View style={styles.radioDot} />}
            </View>
            <View style={styles.optionText}>
              <Text style={[styles.optionLabel, selected === mode && styles.optionLabelSelected]}>
                {label}
              </Text>
              <Text style={styles.optionDesc}>{desc}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  title: {
    color: '#F3E4C9',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  options: {
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(243,228,201,0.06)',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(243,228,201,0.12)',
  },
  optionSelected: {
    backgroundColor: 'rgba(243,228,201,0.12)',
    borderColor: '#F3E4C9',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(243,228,201,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#F3E4C9',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F3E4C9',
  },
  optionText: { flex: 1, gap: 2 },
  optionLabel: {
    color: 'rgba(243,228,201,0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  optionLabelSelected: {
    color: '#F3E4C9',
    fontWeight: '700',
  },
  optionDesc: {
    color: 'rgba(243,228,201,0.45)',
    fontSize: 12,
  },
});
