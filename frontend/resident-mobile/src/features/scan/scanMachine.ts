export const SCAN_DURATION_MS = 45_000;
export const FRAME_COUNT = 15;
export const MAX_PAYLOAD_BYTES = 4 * 1024 * 1024;

export type ScanState =
  | 'idle' | 'requesting_permission' | 'ready' | 'recording' | 'finalizing_recording'
  | 'sampling' | 'compressing' | 'validating_payload' | 'uploading' | 'spatial_ready'
  | 'error' | 'interrupted';

export type ScanEvent =
  | 'REQUEST_PERMISSION' | 'PERMISSION_GRANTED' | 'PERMISSION_DENIED' | 'START'
  | 'CAPTURE_ENDED' | 'VIDEO_READY' | 'FRAMES_READY' | 'COMPRESSED' | 'PAYLOAD_VALID'
  | 'UPLOAD_SUCCESS' | 'FAIL' | 'INTERRUPT' | 'RETRY' | 'RESET';

const transitions: Record<ScanState, Partial<Record<ScanEvent, ScanState>>> = {
  idle: { REQUEST_PERMISSION: 'requesting_permission', RESET: 'idle' },
  requesting_permission: { PERMISSION_GRANTED: 'ready', PERMISSION_DENIED: 'error', FAIL: 'error' },
  ready: { START: 'recording', RESET: 'idle' },
  recording: { CAPTURE_ENDED: 'finalizing_recording', INTERRUPT: 'interrupted', FAIL: 'error' },
  finalizing_recording: { VIDEO_READY: 'sampling', INTERRUPT: 'interrupted', FAIL: 'error' },
  sampling: { FRAMES_READY: 'compressing', FAIL: 'error' },
  compressing: { COMPRESSED: 'validating_payload', FAIL: 'error' },
  validating_payload: { PAYLOAD_VALID: 'uploading', FAIL: 'error' },
  uploading: { UPLOAD_SUCCESS: 'spatial_ready', INTERRUPT: 'interrupted', FAIL: 'error' },
  spatial_ready: { RESET: 'idle' },
  error: { RETRY: 'ready', RESET: 'idle' },
  interrupted: { RETRY: 'ready', RESET: 'idle' },
};

export function transitionScan(state: ScanState, event: ScanEvent): ScanState {
  const next = transitions[state][event];
  if (!next) throw new Error(`Transisi scan tidak valid: ${state} + ${event}`);
  return next;
}

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
