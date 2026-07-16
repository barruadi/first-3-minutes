import * as Speech from 'expo-speech';
import * as SecureStore from 'expo-secure-store';

export type AccessibilityMode = 'VISUAL_ONLY' | 'VISUAL_AND_AUDIO' | 'AUDIO_PRIMARY';
export type GuidanceEvent = { id: string; message: string; priority: 'NORMAL' | 'CRITICAL' };
let last: { id: string; at: number } | null = null;
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
  if (last?.id === event.id && now - last.at < 3000) return;
  last = { id: event.id, at: now };
  if (event.priority === 'CRITICAL') Speech.stop();
  Speech.speak(event.message, { language: 'id-ID', rate: 0.92 });
}

export function stopGuidance(): void { Speech.stop(); }
