import {
  GUIDANCE_AUDIO_POLICY,
  type AccessibilityMode,
  type GuidanceEvent,
} from '@3minutes/contracts';
import { guidanceToSpeech, isSameGuidance } from './guidance.js';

/**
 * Browser speech synthesis untuk panduan Guest (D4-ACC-01).
 *
 * Menerapkan GUIDANCE_AUDIO_POLICY frozen agar Guest dan Resident (Expo TTS)
 * berperilaku sama: event identik di-debounce, event CRITICAL menginterupsi
 * ucapan yang sedang berjalan dan menurunkan volume ambience sementara.
 */
export class GuidanceSpeaker {
  private mode: AccessibilityMode;
  private lastEvent: GuidanceEvent | null = null;
  private lastSpokenAtMs = 0;
  private readonly supported: boolean;
  private duckTimer: ReturnType<typeof setTimeout> | null = null;

  /** Elemen audio ambience yang diturunkan volumenya saat pengumuman CRITICAL. */
  private ambience: HTMLAudioElement | null = null;
  private ambienceBaseVolume = 1;

  constructor(mode: AccessibilityMode) {
    this.mode = mode;
    this.supported =
      typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  setMode(mode: AccessibilityMode): void {
    this.mode = mode;
    if (mode === 'VISUAL_ONLY') this.cancel();
  }

  attachAmbience(el: HTMLAudioElement | null): void {
    this.ambience = el;
    if (el) this.ambienceBaseVolume = el.volume;
  }

  private get audioEnabled(): boolean {
    return this.mode === 'VISUAL_AND_AUDIO' || this.mode === 'AUDIO_PRIMARY';
  }

  /**
   * Mengucapkan event bila kebijakan mengizinkan.
   * @returns true bila benar-benar diucapkan.
   */
  announce(event: GuidanceEvent, nowMs: number = Date.now()): boolean {
    if (!this.audioEnabled || !this.supported) return false;

    const isCritical = event.priority === 'CRITICAL';
    const isDuplicate = isSameGuidance(this.lastEvent, event);
    const withinDebounce =
      nowMs - this.lastSpokenAtMs < GUIDANCE_AUDIO_POLICY.duplicateDebounceMs;

    // Event identik tidak diulang tiap frame. Event CRITICAL baru selalu lolos.
    if (isDuplicate && withinDebounce) return false;

    const utterance = new SpeechSynthesisUtterance(guidanceToSpeech(event));
    utterance.lang = 'id-ID';
    utterance.rate = isCritical ? 1.1 : 1.0;

    if (isCritical) {
      // CRITICAL menginterupsi ucapan berjalan; jangan antre di belakang
      // instruksi lama yang sudah tidak relevan.
      window.speechSynthesis.cancel();
      this.duckAmbience();
      utterance.onend = () => this.restoreAmbience();
      utterance.onerror = () => this.restoreAmbience();
    }

    window.speechSynthesis.speak(utterance);
    this.lastEvent = event;
    this.lastSpokenAtMs = nowMs;
    return true;
  }

  private duckAmbience(): void {
    if (!this.ambience) return;
    if (this.duckTimer) {
      clearTimeout(this.duckTimer);
      this.duckTimer = null;
    }
    this.ambience.volume =
      this.ambienceBaseVolume * GUIDANCE_AUDIO_POLICY.duckedAmbienceVolume;
  }

  private restoreAmbience(): void {
    if (!this.ambience) return;
    this.duckTimer = setTimeout(() => {
      if (this.ambience) this.ambience.volume = this.ambienceBaseVolume;
      this.duckTimer = null;
    }, GUIDANCE_AUDIO_POLICY.duckRestoreDelayMs);
  }

  cancel(): void {
    if (this.supported) window.speechSynthesis.cancel();
    if (this.duckTimer) {
      clearTimeout(this.duckTimer);
      this.duckTimer = null;
    }
    this.restoreAmbience();
  }

  /** Wajib dipanggil saat unmount — speechSynthesis bersifat global. */
  dispose(): void {
    this.cancel();
    this.lastEvent = null;
    this.ambience = null;
  }

  get isSupported(): boolean {
    return this.supported;
  }
}
