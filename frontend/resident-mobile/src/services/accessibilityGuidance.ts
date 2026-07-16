import * as Speech from 'expo-speech';
import * as SecureStore from 'expo-secure-store';
import { GUIDANCE_AUDIO_POLICY, type AccessibilityMode, type GuidanceAction, type GuidanceEvent } from '@3minutes/contracts';

export type { AccessibilityMode };

const GUIDANCE_TEXT: Record<GuidanceAction, string> = {
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

let last: { action: string; at: number } | null = null;
const MODE_KEY = 'three-minutes.accessibility-mode.v1';

export async function getAccessibilityMode(): Promise<AccessibilityMode> {
  const stored = await SecureStore.getItemAsync(MODE_KEY);
  return stored === 'VISUAL_AND_AUDIO' || stored === 'AUDIO_PRIMARY' ? stored : 'VISUAL_ONLY';
}

export async function setAccessibilityMode(mode: AccessibilityMode): Promise<void> {
  await SecureStore.setItemAsync(MODE_KEY, mode);
}

export function announceGuidance(mode: AccessibilityMode, event: GuidanceEvent): void {
  if (mode === 'VISUAL_ONLY') return;
  const now = Date.now();
  if (last?.action === event.action && now - last.at < GUIDANCE_AUDIO_POLICY.duplicateDebounceMs) return;
  last = { action: event.action, at: now };
  if (event.priority === 'CRITICAL') Speech.stop();
  const text = GUIDANCE_TEXT[event.action];
  if (!text) return;
  Speech.speak(text, { language: 'id-ID', rate: 0.92 });
}

export function stopGuidance(): void { Speech.stop(); }
