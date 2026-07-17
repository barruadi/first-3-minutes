import { describe, expect, it } from 'vitest';
import { MAX_FILE_BYTES, validateFloorPlanFile } from '../upload.js';

describe('floor plan validation', () => {
  it('accepts supported images', () => {
    expect(validateFloorPlanFile(new File(['map'], 'floor.png', { type: 'image/png' }))).toBeNull();
  });

  it('rejects unsupported formats and oversized files', () => {
    expect(validateFloorPlanFile(new File(['x'], 'floor.txt', { type: 'text/plain' }))).toContain('Format');
    const oversized = new File([new Uint8Array(MAX_FILE_BYTES + 1)], 'floor.pdf', { type: 'application/pdf' });
    expect(validateFloorPlanFile(oversized)).toContain('10 MB');
  });
});
