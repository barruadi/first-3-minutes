import { formatCountdown, formatCountdownMs } from '../hooks/useMonotonicCountdown';

describe('formatCountdown', () => {
  it('formats 0ms as 00:00', () => {
    expect(formatCountdown(0)).toBe('00:00');
  });

  it('formats 30000ms as 00:30', () => {
    expect(formatCountdown(30_000)).toBe('00:30');
  });

  it('formats 90000ms as 01:30', () => {
    expect(formatCountdown(90_000)).toBe('01:30');
  });

  it('formats 3600000ms as 60:00', () => {
    expect(formatCountdown(3_600_000)).toBe('60:00');
  });

  it('ceils partial seconds (rounds up)', () => {
    expect(formatCountdown(9_999)).toBe('00:10');
    expect(formatCountdown(1_001)).toBe('00:02');
  });

  it('pads single-digit seconds', () => {
    expect(formatCountdown(5_000)).toBe('00:05');
  });
});

describe('formatCountdownMs', () => {
  it('formats 0ms as 00:00.00', () => {
    expect(formatCountdownMs(0)).toBe('00:00.00');
  });

  it('formats 1234ms as 00:01.23', () => {
    expect(formatCountdownMs(1_234)).toBe('00:01.23');
  });

  it('formats 30000ms as 00:30.00', () => {
    expect(formatCountdownMs(30_000)).toBe('00:30.00');
  });

  it('formats 90500ms as 01:30.50', () => {
    expect(formatCountdownMs(90_500)).toBe('01:30.50');
  });
});
