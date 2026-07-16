import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { SpatialObject } from '@3minutes/contracts';
import type { DrillPhase, PostureStatus } from '../types';
import ArDirectionArrow from './ArDirectionArrow';
import SmokeOverlay from './SmokeOverlay';
import PostureWarning from './PostureWarning';
import QTEOverlay from './QTEOverlay';
import type { QTEState } from '../hooks/useQTEEngine';

interface Props {
  phase: DrillPhase;
  targetExit: SpatialObject | null;
  targetHazard: SpatialObject | null;
  posture: PostureStatus;
  qteState: QTEState;
  onQTETap: () => void;
  onTriggerQTE: () => void;
  onExitReached: () => void;
  onAbort: () => void;
  smokeEscapeStartedAt: number | null;
}

export default function SmokeEscapePhase({
  phase,
  targetExit,
  targetHazard,
  posture,
  qteState,
  onQTETap,
  onTriggerQTE,
  onExitReached,
  onAbort,
  smokeEscapeStartedAt,
}: Props) {
  const isSmokeActive = phase === 'smoke_escape' || phase === 'posture_warning' || phase === 'qte_active';
  const isPostureViolation = phase === 'posture_warning';

  const elapsedSec = smokeEscapeStartedAt
    ? Math.floor((Date.now() - smokeEscapeStartedAt) / 1000)
    : 0;

  return (
    <View style={styles.container}>
      {/* Smoke overlay behind everything */}
      <SmokeOverlay visible={isSmokeActive} />

      {/* Top HUD */}
      <View style={styles.topHud}>
        <View style={styles.timerBadge}>
          <Text style={styles.timerLabel}>Evakuasi</Text>
          <Text style={styles.timerValue}>{elapsedSec}s</Text>
        </View>
        <View style={styles.postureIndicator}>
          <View style={[styles.postureDot,
            posture === 'LOW' && styles.postureDotOk,
            posture === 'TOO_HIGH' && styles.postureDotBad,
          ]} />
          <Text style={styles.postureLabel}>
            {posture === 'LOW' ? 'Rendah ✓' : posture === 'TOO_HIGH' ? 'Terlalu Tinggi!' : 'Postur'}
          </Text>
        </View>
      </View>

      {/* Direction arrow toward exit */}
      {targetExit && phase !== 'qte_active' && (
        <ArDirectionArrow target={targetExit.position} visible={isSmokeActive} />
      )}

      {/* Bottom action area */}
      {phase === 'smoke_escape' && (
        <View style={styles.bottomActions}>
          <View style={styles.instructionCard}>
            <Text style={styles.instructionText}>
              Tetap merunduk — ikuti panah menuju pintu keluar
            </Text>
            {targetExit && (
              <Text style={styles.exitLabel}>Target: {targetExit.label}</Text>
            )}
          </View>

          {/* Obstacle trigger (shown after brief delay) */}
          {targetHazard && (
            <TouchableOpacity
              style={styles.hazardButton}
              onPress={onTriggerQTE}
              accessible
              accessibilityLabel="Mendekati rintangan"
              accessibilityRole="button"
            >
              <Text style={styles.hazardButtonText}>⚠️ Ada Rintangan!</Text>
              <Text style={styles.hazardButtonSub}>Ketuk untuk melewati</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.exitButton}
            onPress={onExitReached}
            accessible
            accessibilityLabel="Saya telah mencapai pintu keluar"
            accessibilityRole="button"
          >
            <Text style={styles.exitButtonText}>🚪 Saya Telah Mencapai Pintu Keluar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Posture warning overlay */}
      <PostureWarning visible={isPostureViolation} />

      {/* QTE overlay */}
      {phase === 'qte_active' && (
        <QTEOverlay qteState={qteState} onTap={onQTETap} />
      )}

      {/* Abort button */}
      {phase !== 'qte_active' && (
        <TouchableOpacity style={styles.abortButton} onPress={onAbort}>
          <Text style={styles.abortText}>✕ Batalkan</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topHud: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  timerLabel: { color: 'rgba(243,228,201,0.6)', fontSize: 10, fontWeight: '500' },
  timerValue: { color: '#F3E4C9', fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  postureIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  postureDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(243,228,201,0.3)',
  },
  postureDotOk: { backgroundColor: '#39FF14' },
  postureDotBad: { backgroundColor: '#D93025' },
  postureLabel: { color: '#F3E4C9', fontSize: 13, fontWeight: '600' },
  bottomActions: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    gap: 10,
  },
  instructionCard: {
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: 12,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(243,228,201,0.15)',
  },
  instructionText: {
    color: '#F3E4C9',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  exitLabel: {
    color: '#39FF14',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  hazardButton: {
    backgroundColor: 'rgba(217,48,37,0.85)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 2,
  },
  hazardButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  hazardButtonSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },
  exitButton: {
    backgroundColor: '#39FF14',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    minHeight: 52,
  },
  exitButtonText: {
    color: '#0A2947',
    fontSize: 15,
    fontWeight: '800',
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
