/**
 * useQTEEngine tests run with fake timers to control the 2s QTE window.
 */
import { renderHook, act } from '@testing-library/react-hooks';
import { useQTEEngine } from '../hooks/useQTEEngine';
import { QTE_WINDOW_MS, QTE_REQUIRED_TAPS } from '../types';

describe('useQTEEngine', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts in idle state', () => {
    const { result } = renderHook(() => useQTEEngine(jest.fn(), jest.fn()));
    expect(result.current.state.status).toBe('idle');
    expect(result.current.state.tapCount).toBe(0);
  });

  it('activates the QTE window on activate()', () => {
    const { result } = renderHook(() => useQTEEngine(jest.fn(), jest.fn()));
    act(() => { result.current.activate(); });
    expect(result.current.state.status).toBe('active');
  });

  it(`succeeds on ${QTE_REQUIRED_TAPS} taps within window`, () => {
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useQTEEngine(onSuccess, jest.fn()));

    act(() => { result.current.activate(); });

    for (let i = 0; i < QTE_REQUIRED_TAPS; i++) {
      act(() => { result.current.recordTap(); });
    }

    expect(result.current.state.status).toBe('success');
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('calls onTimeout and transitions to failed then resets after window expires', () => {
    const onTimeout = jest.fn();
    const { result } = renderHook(() => useQTEEngine(jest.fn(), onTimeout));

    act(() => { result.current.activate(); });
    // Advance past the window without enough taps
    act(() => { jest.advanceTimersByTime(QTE_WINDOW_MS + 100); });

    expect(result.current.state.status).toBe('failed');
    expect(onTimeout).toHaveBeenCalledTimes(1);

    // After 800ms failed-display window, should auto-reset to idle
    act(() => { jest.advanceTimersByTime(800 + 100); });
    expect(result.current.state.status).toBe('idle');
    expect(result.current.state.tapCount).toBe(0);
  });

  it('does not count taps when idle', () => {
    const { result } = renderHook(() => useQTEEngine(jest.fn(), jest.fn()));
    act(() => { result.current.recordTap(); });
    expect(result.current.state.tapCount).toBe(0);
  });

  it('reset() returns to idle from any state', () => {
    const { result } = renderHook(() => useQTEEngine(jest.fn(), jest.fn()));

    act(() => { result.current.activate(); });
    act(() => { result.current.recordTap(); });
    expect(result.current.state.tapCount).toBe(1);

    act(() => { result.current.reset(); });
    expect(result.current.state.status).toBe('idle');
    expect(result.current.state.tapCount).toBe(0);
  });

  it('accumulates taps correctly before success threshold', () => {
    const { result } = renderHook(() => useQTEEngine(jest.fn(), jest.fn()));

    act(() => { result.current.activate(); });

    for (let i = 1; i < QTE_REQUIRED_TAPS; i++) {
      act(() => { result.current.recordTap(); });
      expect(result.current.state.tapCount).toBe(i);
      expect(result.current.state.status).toBe('active');
    }
  });
});
