import { z } from 'zod';

/**
 * Kontrak aksesibilitas suara — FROZEN v1 (ACC-001).
 * Sumber: prompts/docs/architecture.md §8.8, prompts/docs/prd.md §6.6 dan §9.
 *
 * Consumer: Domain 1 (TTS Expo), Domain 2 (guidance decision engine),
 * Domain 4 (browser speech synthesis pada Guest WebAR).
 */

export const AccessibilityModeSchema = z.enum([
  'VISUAL_ONLY',
  'VISUAL_AND_AUDIO',
  'AUDIO_PRIMARY',
]);
export type AccessibilityMode = z.infer<typeof AccessibilityModeSchema>;

/**
 * Tindakan semantik, bukan copy. Setiap client menerjemahkan action ini
 * menjadi bahasa Indonesia yang jelas. Jangan menambahkan action yang
 * merujuk warna, ikon, teks, atau panah.
 */
export const GuidanceActionSchema = z.enum([
  'GO_STRAIGHT',
  'TURN_LEFT',
  'TURN_RIGHT',
  'AVOID_LEFT',
  'AVOID_RIGHT',
  'STAY_LOW',
  'SAFE_ZONE_LEFT',
  'SAFE_ZONE_RIGHT',
  'EXIT_AHEAD',
  'ARRIVED',
]);
export type GuidanceAction = z.infer<typeof GuidanceActionSchema>;

export const GuidancePrioritySchema = z.enum(['NORMAL', 'CRITICAL']);
export type GuidancePriority = z.infer<typeof GuidancePrioritySchema>;

export const GuidanceEventSchema = z.object({
  action: GuidanceActionSchema,
  distanceMeters: z.number().min(0).optional(),
  priority: GuidancePrioritySchema,
});
export type GuidanceEvent = z.infer<typeof GuidanceEventSchema>;

/**
 * Audio policy FROZEN (architecture.md §8.8):
 * - Event CRITICAL menginterupsi atau menurunkan volume ambience/alarm sementara.
 * - Event identik harus di-debounce; jangan mengulang setiap frame.
 * - AUDIO_PRIMARY wajib mengucapkan SELURUH event CRITICAL.
 *
 * Nilai debounce dibekukan agar Domain 1 dan Domain 4 berperilaku sama.
 */
export const GUIDANCE_AUDIO_POLICY = {
  /** Event identik yang sama tidak diucapkan ulang dalam window ini. */
  duplicateDebounceMs: 3000,
  /** Volume ambience/alarm selama pengumuman CRITICAL (0..1). */
  duckedAmbienceVolume: 0.2,
  /** Ambience dipulihkan setelah pengumuman selesai + delay ini. */
  duckRestoreDelayMs: 250,
} as const;
