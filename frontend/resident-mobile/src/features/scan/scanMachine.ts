export const LIDAR_SCAN_DURATION_MS = 20_000;

// Legacy constants kept for scanFiles.ts (video pipeline no longer used in ScanScreen)
export const SCAN_DURATION_MS = 45_000;
export const FRAME_COUNT = 15;
export const MAX_PAYLOAD_BYTES = 4 * 1024 * 1024;

export type ScanState =
  | 'idle'
  | 'scanning'
  | 'generating'
  | 'uploading'
  | 'spatial_ready'
  | 'error';

export type ScanEvent =
  | 'START'
  | 'SCAN_COMPLETE'
  | 'FLOOR_PLAN_READY'
  | 'UPLOAD_SUCCESS'
  | 'FAIL'
  | 'RESET';

const transitions: Record<ScanState, Partial<Record<ScanEvent, ScanState>>> = {
  idle:          { START: 'scanning' },
  scanning:      { SCAN_COMPLETE: 'generating', FAIL: 'error' },
  generating:    { FLOOR_PLAN_READY: 'uploading', FAIL: 'error' },
  uploading:     { UPLOAD_SUCCESS: 'spatial_ready', FAIL: 'error' },
  spatial_ready: { RESET: 'idle' },
  error:         { RESET: 'idle' },
};

export function transitionScan(state: ScanState, event: ScanEvent): ScanState {
  const next = transitions[state]?.[event];
  if (!next) throw new Error(`Transisi scan tidak valid: ${state} + ${event}`);
  return next;
}

// Legacy helpers kept for backward compatibility with scanFiles.ts
export function generateTargetTimestamps(durationMs = SCAN_DURATION_MS, count = FRAME_COUNT): number[] {
  if (!Number.isFinite(durationMs) || durationMs <= 0 || !Number.isInteger(count) || count <= 0) {
    throw new Error('Durasi dan jumlah frame harus positif');
  }
  return Array.from({ length: count }, (_, index) => Math.round(((index + 1) * durationMs) / count));
}

export function totalPayloadBytes(frames: ReadonlyArray<{ sizeBytes: number }>): number {
  return frames.reduce((total, frame) => {
    if (!Number.isFinite(frame.sizeBytes) || frame.sizeBytes < 0) throw new Error('Ukuran frame tidak valid');
    return total + frame.sizeBytes;
  }, 0);
}

export function validatePreparedFrames(frames: ReadonlyArray<{ sizeBytes: number }>): number {
  if (frames.length !== FRAME_COUNT) throw new Error(`Dibutuhkan tepat ${FRAME_COUNT} frame, ditemukan ${frames.length}`);
  const bytes = totalPayloadBytes(frames);
  if (bytes > MAX_PAYLOAD_BYTES) throw new Error('Payload tetap melebihi 4 MB setelah kompresi');
  return bytes;
}
