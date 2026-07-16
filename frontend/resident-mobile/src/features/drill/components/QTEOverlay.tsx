import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, useRef,
} from 'react-native';
import type { QTEState } from '../hooks/useQTEEngine';
import { QTE_REQUIRED_TAPS } from '../types';

interface Props {
  qteState: QTEState;
  onTap: () => void;
}

export default function QTEOverlay({ qteState, onTap }: Props) {
  const { status, tapCount, windowRemainingMs } = qteState;

  if (status === 'idle') return null;

  const progressFraction = Math.max(0, windowRemainingMs) / 2000;
  const isFailed = status === 'failed';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>
          {isFailed ? 'Gagal! Coba lagi' : 'Ketuk Rintangan!'}
        </Text>

        {/* Tap progress dots */}
        <View style={styles.dots}>
          {Array.from({ length: QTE_REQUIRED_TAPS }).map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i < tapCount && styles.dotFilled]}
            />
          ))}
        </View>

        <Text style={styles.counter}>
          {tapCount}/{QTE_REQUIRED_TAPS} ketukan
        </Text>

        {/* Window progress bar */}
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${progressFraction * 100}%` },
              isFailed && styles.progressFailed,
            ]}
          />
        </View>
        <Text style={styles.timeLabel}>
          {(windowRemainingMs / 1000).toFixed(1)} detik tersisa
        </Text>

        <TouchableOpacity
          style={[styles.tapButton, isFailed && styles.tapButtonFailed]}
          onPress={onTap}
          activeOpacity={0.6}
          accessible
          accessibilityLabel="Ketuk rintangan"
          accessibilityRole="button"
        >
          <Text style={styles.tapButtonText}>
            {isFailed ? '✕' : '✋ KETUK'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  card: {
    backgroundColor: '#0A2947',
    borderRadius: 20,
    padding: 28,
    width: 300,
    alignItems: 'center',
    gap: 16,
    borderWidth: 2,
    borderColor: 'rgba(243,228,201,0.3)',
  },
  title: {
    color: '#F3E4C9',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 12,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(243,228,201,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(243,228,201,0.5)',
  },
  dotFilled: {
    backgroundColor: '#39FF14',
    borderColor: '#39FF14',
  },
  counter: {
    color: 'rgba(243,228,201,0.7)',
    fontSize: 14,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(243,228,201,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: '#39FF14',
    borderRadius: 3,
  },
  progressFailed: {
    backgroundColor: '#D93025',
  },
  timeLabel: {
    color: 'rgba(243,228,201,0.5)',
    fontSize: 12,
  },
  tapButton: {
    backgroundColor: '#39FF14',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 48,
    marginTop: 8,
    minWidth: '80%',
    alignItems: 'center',
    minHeight: 56,
  },
  tapButtonFailed: {
    backgroundColor: '#D93025',
  },
  tapButtonText: {
    color: '#0A2947',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
