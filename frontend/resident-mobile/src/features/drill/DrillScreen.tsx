import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, AppState, AppStateStatus } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { SpatialMap } from '@3minutes/contracts';
import type { RootTabParamList } from '../../navigation/RootNavigator';
import { useDrillStateMachine } from './hooks/useDrillStateMachine';
import { useDrillAudio } from './hooks/useDrillAudio';
import { selectNearestSafeZone, selectNearestExitPoint } from './ar/SafeZoneSelector';
import type { AccessibilityMode } from './types';
import { DEMO_SCAN_ID, DEMO_INSTALLATION_ID } from './types';
import { spatialSession } from '../../services/spatialSession';
import DrillReadyScreen from './DrillReadyScreen';
import DrillResultScreen from './DrillResultScreen';
import EarthquakePhase from './components/EarthquakePhase';
import SmokeEscapePhase from './components/SmokeEscapePhase';
import FailureSummary from './components/FailureSummary';

// Demo SpatialMap fixture used when no scan has been completed yet.
const DEMO_SPATIAL_MAP: SpatialMap = {
  scanId: DEMO_SCAN_ID,
  origin: { x: 0, y: 0, z: 0 },
  safeZones: [
    { id: 'safe-1', type: 'SAFE_ZONE', label: 'sturdy_table', position: { x: 1.2, y: 0.0, z: -2.4 }, confidence: 0.91 },
  ],
  hazardZones: [
    { id: 'hazard-1', type: 'HAZARD_ZONE', label: 'tall_cabinet', position: { x: -1.5, y: 0.0, z: -1.0 }, confidence: 0.85 },
  ],
  exitPoints: [
    { id: 'exit-1', type: 'EXIT_POINT', label: 'main_door', position: { x: 2.1, y: 0.0, z: -5.0 }, confidence: 0.97 },
  ],
  source: 'fallback',
  createdAt: new Date().toISOString(),
};

type Nav = BottomTabNavigationProp<RootTabParamList, 'Drill'>;

interface Props {
  // Accepts optional pre-loaded SpatialMap (can be passed from ScanScreen via context in future)
  spatialMap?: SpatialMap | null;
}

export default function DrillScreen({ spatialMap: propMap }: Props) {
  const navigation = useNavigation<Nav>();
  const [permission, requestPermission] = useCameraPermissions();
  const [accessibilityMode, setAccessibilityMode] = useState<AccessibilityMode>('VISUAL_AND_AUDIO');
  const [drillStarted, setDrillStarted] = useState(false);

  // Use prop map → session map from completed scan → demo fixture
  const activeSpatialMap: SpatialMap = propMap ?? spatialSession.get()?.map ?? DEMO_SPATIAL_MAP;

  const scanId = activeSpatialMap.scanId;
  const {
    state,
    capability,
    qteState,
    countdownRemainingMs,
    currentLux,
    currentVariance,
    posture,
    postureScorePercentage,
    start,
    triggerQTE,
    recordQTETap,
    confirmExitReached,
    abort,
    reset,
  } = useDrillStateMachine(scanId, DEMO_INSTALLATION_ID);

  const { speakPhaseAnnouncement } = useDrillAudio(state.phase, accessibilityMode);

  // Phase announcements for VISUAL_AND_AUDIO and AUDIO_PRIMARY modes
  useEffect(() => {
    if (state.phase === 'earthquake') speakPhaseAnnouncement('Gempa! Cari perlindungan sekarang!');
    if (state.phase === 'shelter_validated') speakPhaseAnnouncement('Berlindung berhasil! Bersiap evakuasi.');
    if (state.phase === 'smoke_escape') speakPhaseAnnouncement('Evakuasi! Tetap merunduk dan ikuti arah panah.');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  // Select target zones
  const targetSafeZone = selectNearestSafeZone(activeSpatialMap.safeZones);
  const targetExit = selectNearestExitPoint(activeSpatialMap.exitPoints);
  const targetHazard = activeSpatialMap.hazardZones[0] ?? null;

  // Fullscreen during active drill — hide bottom tabs
  const isDrillActive =
    drillStarted &&
    state.phase !== 'ready' &&
    state.phase !== 'result';

  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: isDrillActive
        ? { display: 'none' }
        : { backgroundColor: '#0A2947', borderTopColor: 'rgba(243,228,201,0.15)' },
    });
  }, [isDrillActive, navigation]);

  // App backgrounded → failure
  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    if (!isDrillActive) return;
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appStateRef.current === 'active' && next !== 'active') {
        abort('app_backgrounded');
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [isDrillActive, abort]);

  const handleStart = useCallback(
    (mode: AccessibilityMode) => {
      if (!permission?.granted) {
        void requestPermission().then((result) => {
          if (result.granted) {
            setAccessibilityMode(mode);
            setDrillStarted(true);
            start();
          }
        });
        return;
      }
      setAccessibilityMode(mode);
      setDrillStarted(true);
      start();
    },
    [permission, requestPermission, start],
  );

  const handleAbort = useCallback(() => {
    abort('internal_error');
  }, [abort]);

  const handleReset = useCallback(() => {
    reset();
    setDrillStarted(false);
  }, [reset]);

  // Show ready screen
  if (!drillStarted || state.phase === 'ready') {
    return (
      <DrillReadyScreen
        spatialMap={activeSpatialMap}
        onStart={handleStart}
        onScanFirst={() => navigation.navigate('Scan')}
      />
    );
  }

  // Show result screen
  if (state.phase === 'result') {
    return (
      <DrillResultScreen
        result={state.result}
        reactionTimeMs={
          state.shelterCandidateAt && state.earthquakeStartedAt
            ? state.shelterCandidateAt - state.earthquakeStartedAt
            : null
        }
        evacuationTimeMs={
          state.exitReachedAt && state.smokeEscapeStartedAt
            ? state.exitReachedAt - state.smokeEscapeStartedAt
            : null
        }
        postureScorePercentage={postureScorePercentage}
        onHome={() => {
          handleReset();
          navigation.navigate('Home');
        }}
        onRetry={handleReset}
      />
    );
  }

  // Show failure screen
  if (state.phase === 'failure') {
    return (
      <FailureSummary
        reason={state.failureReason}
        onRetry={handleReset}
        onClose={() => {
          handleReset();
          navigation.navigate('Home');
        }}
      />
    );
  }

  // Active drill: camera feed + AR overlay
  const isEarthquakePhase =
    state.phase === 'earthquake' ||
    state.phase === 'shelter_candidate' ||
    state.phase === 'shelter_validated';

  const isSmokePhase =
    state.phase === 'smoke_escape' ||
    state.phase === 'posture_warning' ||
    state.phase === 'qte_active';

  return (
    <View style={styles.container}>
      {/* Camera feed */}
      {permission?.granted ? (
        <CameraView style={StyleSheet.absoluteFill} facing="back" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.noCameraFallback]} />
      )}

      {/* Earthquake / Drop-Cover-Hold phase */}
      {isEarthquakePhase && (
        <EarthquakePhase
          phase={state.phase}
          countdownRemainingMs={countdownRemainingMs}
          targetSafeZone={targetSafeZone}
          isLightSensorAvailable={capability.lightSensor}
          currentLux={currentLux}
          currentVariance={currentVariance}
          candidateStartedAt={state.shelterCandidateAt}
          onAbort={handleAbort}
        />
      )}

      {/* Smoke escape phase */}
      {isSmokePhase && (
        <SmokeEscapePhase
          phase={state.phase}
          targetExit={targetExit}
          targetHazard={targetHazard}
          posture={posture}
          qteState={qteState}
          onQTETap={recordQTETap}
          onTriggerQTE={triggerQTE}
          onExitReached={confirmExitReached}
          onAbort={handleAbort}
          smokeEscapeStartedAt={state.smokeEscapeStartedAt}
        />
      )}

      {/* Submitting overlay */}
      {state.phase === 'submitting' && (
        <View style={styles.submittingOverlay}>
          <View style={styles.submittingCard}>
            <Text style={styles.submittingText}>Mengirim hasil latihan...</Text>
          </View>
        </View>
      )}

      {/* Completed transition */}
      {state.phase === 'completed' && (
        <View style={styles.completedOverlay}>
          <View style={styles.completedCard}>
            <Text style={styles.completedIcon}>🎉</Text>
            <Text style={styles.completedText}>Evakuasi Berhasil!</Text>
            <Text style={styles.completedSub}>Memproses hasil...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  noCameraFallback: { backgroundColor: '#0A2947' },

  submittingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,41,71,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submittingCard: {
    backgroundColor: 'rgba(243,228,201,0.08)',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(243,228,201,0.2)',
  },
  submittingText: { color: '#F3E4C9', fontSize: 16, fontWeight: '600' },

  completedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,41,71,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedCard: {
    backgroundColor: 'rgba(57,255,20,0.1)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#39FF14',
  },
  completedIcon: { fontSize: 52 },
  completedText: { color: '#39FF14', fontSize: 24, fontWeight: '800' },
  completedSub: { color: 'rgba(57,255,20,0.7)', fontSize: 14 },
});
