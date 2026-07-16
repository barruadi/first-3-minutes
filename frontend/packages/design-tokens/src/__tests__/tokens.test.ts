import { describe, it, expect } from 'vitest';
import { colors, spacing, radius, typography } from '../tokens.js';

describe('Design tokens', () => {
  it('exports brand palette correctly', () => {
    expect(colors.primary900).toBe('#0A2947');
    expect(colors.surfaceWarm).toBe('#F3E4C9');
    expect(colors.surfaceMuted).toBe('#D3D4C0');
    expect(colors.accentEarth).toBe('#8B5E3C');
  });

  it('exports spacing tokens', () => {
    expect(spacing.xs).toBe(4);
    expect(spacing.md).toBe(16);
  });

  it('exports radius tokens', () => {
    expect(radius.sm).toBe(4);
    expect(radius.full).toBe(9999);
  });

  it('exports typography tokens', () => {
    expect(typography.fontSizeMd).toBe(16);
  });
});
