import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { SpatialObject } from '@3minutes/contracts';
import type { DrillPhase } from '../types';
import { SHELTER_VALIDATION_MS } from '../types';
import CountdownDisplay from './CountdownDisplay';
import ArDirectionArrow from './ArDirectionArrow';
import CameraShakeWrapper from './CameraShakeWrapper';

interface Props {
  phase: DrillPhase;
  countdownRemainingMs: number;
  targetSafeZone: SpatialObject | null;
  isLightSensorAvailable: boolean;
  currentLux: number | null;
  currentVariance: number;
  candidateStartedAt: number | null;
  onAbort: () => void;
}

export default function EarthquakePhase({
  phase,
  countdownRemainingMs,
  targetSafeZone,
  isLightSensorAvailable,
  currentLux,
  currentVariance,
  candidateStartedAt,
  onAbort,
}: Props) {
  const isCandidate = phase === 'shelter_candidate';
  const isValidated = phase === 'shelter_validated';

  const shelterRemainingMs = candidateStartedAt
    ? Math.max(0, SHELTER_VALIDATION_MS - (Date.now() - candidateStartedAt))
    : SHELTER_VALIDATION_MS;

  const isDark = !isLightSensorAvailable
    ? true
    : (currentLux !== null && currentLux < 10);
  const isStable = isFinite(currentVariance) && currentVariance < 0.05;

  return (
    <View style={styles.container}>
      <CameraShakeWrapper active={phase === 'earthquake' || phase === 'shelter_candidate'}>
        {/* Top HUD */}
        <View style={styles.topHud}>
          <CountdownDisplay remainingMs={countdownRemainingMs} label="Waktu Berlindung" />
        </View>

        {/* Phase instruction */}
        <View style={styles.instructionContainer}>
          {isValidated ? (
            <View style={styles.successBadge}>
              <Text style={styles.successIcon}>✓</Text>
              <Text style={styles.successText}>Berlindung Berhasil!</Text>
              <Text style={styles.successSub}>Bersiap untuk evakuasi...</Text>
            </View>
          ) : isCandidate ? (
            <View style={styles.candidateBadge}>
              <Text style={styles.candidateTitle}>Tahan Posisi!</Text>
              <Text style={styles.candidateSub}>
                {((shelterRemainingMs) / 1000).toFixed(1)} detik lagi
              </Text>
              <View style={styles.sensorRow}>
                <SensorDot ok={isDark} label={isLightSensorAvailable ? `${(currentLux ?? 0).toFixed(0)} lux` : 'Gelap'} />
                <SensorDot ok={isStable} label="Stabil" />
              </View>
            </View>
          ) : (
            <View style={styles.instructionBadge}>
              <Text style={styles.instructionIcon}>🔽</Text>
              <Text style={styles.instructionText}>DROP — COVER — HOLD</Text>
              <Text style={styles.instructionSub}>
                Berlindung di bawah meja dan tahan dalam kegelapan
              </Text>
              {targetSafeZone && (
                <Text style={styles.targetLabel}>
                  Target: {targetSafeZone.label}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Direction arrow */}
        {targetSafeZone && !isValidated && (
          <ArDirectionArrow
            target={targetSafeZone.position}
            visible={phase === 'earthquake'}
          />
        )}

        {/* Abort button */}
        <TouchableOpacity style={styles.abortButton} onPress={onAbort}>
          <Text style={styles.abortText}>✕ Batalkan</Text>
        </TouchableOpacity>
      </CameraShakeWrapper>
    </View>
  );
}

function SensorDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View style={styles.sensorDot}>
      <View style={[styles.dot, ok ? styles.dotOk : styles.dotBad]} />
      <Text style={styles.sensorLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topHud: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
  },
  instructionContainer: {
    position: 'absolute',
    bottom: 60,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  instructionBadge: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(243,228,201,0.2)',
    width: '100%',
  },
  instructionIcon: { fontSize: 28 },
  instructionText: {
    color: '#F3E4C9',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
  instructionSub: {
    color: 'rgba(243,228,201,0.75)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  targetLabel: {
    color: '#39FF14',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  candidateBadge: {
    backgroundColor: 'rgba(57,255,20,0.12)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#39FF14',
    width: '100%',
  },
  candidateTitle: {
    color: '#39FF14',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
  },
  candidateSub: {
    color: 'rgba(57,255,20,0.8)',
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  sensorRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  sensorDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotOk: { backgroundColor: '#39FF14' },
  dotBad: { backgroundColor: '#D93025' },
  sensorLabel: { color: 'rgba(243,228,201,0.7)', fontSize: 12 },
  successBadge: {
    backgroundColor: 'rgba(57,255,20,0.18)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#39FF14',
    width: '100%',
  },
  successIcon: { fontSize: 44 },
  successText: {
    color: '#39FF14',
    fontSize: 24,
    fontWeight: '800',
  },
  successSub: {
    color: 'rgba(57,255,20,0.7)',
    fontSize: 14,
  },
  abortButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(217,48,37,0.4)',
  },
  abortText: {
    color: 'rgba(217,48,37,0.8)',
    fontSize: 13,
    fontWeight: '600',
  },
});
