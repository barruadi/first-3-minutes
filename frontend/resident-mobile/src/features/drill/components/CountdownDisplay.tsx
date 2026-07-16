import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { formatCountdownMs } from '../hooks/useMonotonicCountdown';

interface Props {
  remainingMs: number;
  label?: string;
}

export default function CountdownDisplay({ remainingMs, label = 'Sisa Waktu' }: Props) {
  const isUrgent = remainingMs < 10_000;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.timer, isUrgent && styles.timerUrgent]}>
        {formatCountdownMs(remainingMs)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
  },
  label: {
    color: 'rgba(243,228,201,0.7)',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  timer: {
    color: '#F3E4C9',
    fontSize: 44,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
    lineHeight: 52,
  },
  timerUrgent: {
    color: '#D93025',
  },
});
