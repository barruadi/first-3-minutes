import { FRAME_COUNT, MAX_PAYLOAD_BYTES, generateTargetTimestamps, transitionScan, validatePreparedFrames } from '../scanMachine';
import { describe, expect, it } from '@jest/globals';

describe('scan state machine', () => {
  it('menjalankan happy path secara eksplisit', () => {
    let state = transitionScan('idle', 'REQUEST_PERMISSION');
    state = transitionScan(state, 'PERMISSION_GRANTED'); state = transitionScan(state, 'START');
    state = transitionScan(state, 'CAPTURE_ENDED'); state = transitionScan(state, 'VIDEO_READY');
    state = transitionScan(state, 'FRAMES_READY'); state = transitionScan(state, 'COMPRESSED');
    state = transitionScan(state, 'PAYLOAD_VALID'); state = transitionScan(state, 'UPLOAD_SUCCESS');
    expect(state).toBe('spatial_ready');
  });
  it('menolak transisi ilegal', () => expect(() => transitionScan('idle', 'UPLOAD_SUCCESS')).toThrow());
});

describe('sampling contract', () => {
  it('menghasilkan target 3 sampai 45 detik, tepat 15', () => {
    const targets = generateTargetTimestamps();
    expect(targets).toHaveLength(FRAME_COUNT); expect(targets[0]).toBe(3000); expect(targets[14]).toBe(45000);
    expect([...targets].sort((a, b) => a - b)).toEqual(targets);
  });
  it('memvalidasi jumlah dan budget payload', () => {
    expect(validatePreparedFrames(Array.from({ length: 15 }, () => ({ sizeBytes: 100_000 })))).toBe(1_500_000);
    expect(() => validatePreparedFrames(Array.from({ length: 14 }, () => ({ sizeBytes: 1 })))).toThrow('tepat 15');
    expect(() => validatePreparedFrames(Array.from({ length: 15 }, () => ({ sizeBytes: MAX_PAYLOAD_BYTES / 15 + 1 })))).toThrow('4 MB');
  });
});
