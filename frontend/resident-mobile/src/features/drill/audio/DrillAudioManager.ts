import { Audio } from 'expo-av';

// Place audio files at assets/sounds/earthquake_rumble.mp3 and fire_alarm.mp3.
// If missing, audio is silently skipped — app never crashes over missing sounds.

type SoundKey = 'earthquake' | 'fireAlarm';

const SOUND_SOURCES: Record<SoundKey, number | null> = {
  earthquake: (() => {
    try { return require('../../../../assets/sounds/earthquake_rumble.mp3'); } catch { return null; }
  })(),
  fireAlarm: (() => {
    try { return require('../../../../assets/sounds/fire_alarm.mp3'); } catch { return null; }
  })(),
};

class DrillAudioManager {
  private sounds: Partial<Record<SoundKey, Audio.Sound>> = {};
  private loaded = false;

  async prepare(): Promise<void> {
    if (this.loaded) return;
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      for (const [key, source] of Object.entries(SOUND_SOURCES) as [SoundKey, number | null][]) {
        if (!source) continue;
        try {
          const { sound } = await Audio.Sound.createAsync(source, {
            isLooping: key === 'earthquake',
            volume: key === 'earthquake' ? 0.6 : 0.85,
          });
          this.sounds[key] = sound;
        } catch {
          // Asset missing or decode error — skip silently
        }
      }
      this.loaded = true;
    } catch {
      // Audio mode config failed (simulator) — skip silently
    }
  }

  async startEarthquake(): Promise<void> {
    await this.sounds.earthquake?.playAsync().catch(() => {});
  }

  async stopEarthquake(): Promise<void> {
    await this.sounds.earthquake?.stopAsync().catch(() => {});
    await this.sounds.earthquake?.setPositionAsync(0).catch(() => {});
  }

  async startFireAlarm(): Promise<void> {
    await this.sounds.fireAlarm?.replayAsync().catch(() => {});
  }

  async stopFireAlarm(): Promise<void> {
    await this.sounds.fireAlarm?.stopAsync().catch(() => {});
  }

  async release(): Promise<void> {
    for (const sound of Object.values(this.sounds)) {
      await sound.stopAsync().catch(() => {});
      await sound.unloadAsync().catch(() => {});
    }
    this.sounds = {};
    this.loaded = false;
  }
}

// Singleton per component mount — callers use useDrillAudio hook
export function createDrillAudioManager(): DrillAudioManager {
  return new DrillAudioManager();
}
