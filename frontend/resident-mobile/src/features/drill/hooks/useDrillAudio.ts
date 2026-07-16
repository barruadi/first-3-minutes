import { useEffect, useRef } from 'react';
import * as Speech from 'expo-speech';
import { createDrillAudioManager } from '../audio/DrillAudioManager';
import type { DrillPhase, AccessibilityMode, GuidanceAction } from '../types';

const GUIDANCE_SPEECH: Record<GuidanceAction, string> = {
  GO_STRAIGHT: 'Lurus ke depan',
  TURN_LEFT: 'Belok kiri',
  TURN_RIGHT: 'Belok kanan',
  AVOID_LEFT: 'Hindari kiri',
  AVOID_RIGHT: 'Hindari kanan',
  STAY_LOW: 'Tetap merunduk',
  SAFE_ZONE_LEFT: 'Zona aman di kiri',
  SAFE_ZONE_RIGHT: 'Zona aman di kanan',
  EXIT_AHEAD: 'Pintu keluar di depan',
  ARRIVED: 'Anda telah tiba di zona aman',
};

export function useDrillAudio(phase: DrillPhase, accessibilityMode: AccessibilityMode) {
  const managerRef = useRef(createDrillAudioManager());

  // Prepare audio assets on mount, release on unmount
  useEffect(() => {
    const manager = managerRef.current;
    void manager.prepare();
    return () => {
      void manager.release();
      Speech.stop();
    };
  }, []);

  // Phase-driven audio transitions
  useEffect(() => {
    const manager = managerRef.current;

    if (phase === 'earthquake' || phase === 'shelter_candidate') {
      void manager.startEarthquake();
    }

    if (phase === 'shelter_validated') {
      // D2-TRANSITION-FIRE: stop rumble atomically, fire alarm starts with smoke phase
      void manager.stopEarthquake();
    }

    if (phase === 'smoke_escape') {
      void manager.startFireAlarm();
    }

    if (phase === 'completed' || phase === 'failure' || phase === 'result') {
      void manager.stopEarthquake();
      void manager.stopFireAlarm();
      Speech.stop();
    }
  }, [phase]);

  // TTS for AUDIO_PRIMARY mode
  const speakGuidance = (action: GuidanceAction) => {
    if (accessibilityMode !== 'AUDIO_PRIMARY') return;
    const text = GUIDANCE_SPEECH[action];
    if (!text) return;
    Speech.stop();
    Speech.speak(text, { language: 'id-ID', rate: 1.1 });
  };

  const speakPhaseAnnouncement = (text: string) => {
    if (accessibilityMode === 'VISUAL_ONLY') return;
    Speech.stop();
    Speech.speak(text, { language: 'id-ID', rate: 1.0 });
  };

  return { speakGuidance, speakPhaseAnnouncement };
}
