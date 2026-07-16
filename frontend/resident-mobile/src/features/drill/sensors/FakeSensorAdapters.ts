import type {
  LightSensorAdapter,
  GyroscopeAdapter,
  AccelerometerAdapter,
  LuxReading,
  GyroReading,
  AccelReading,
} from './types';

// Preset scenarios for the sensor test harness.
export type SensorScenario =
  | 'dark_and_stable_success'
  | 'dark_and_unstable_fail'
  | 'bright_and_stable_fail'
  | 'condition_breaks_at_2_9s'
  | 'unsupported';

interface FakeSensorConfig {
  lux: number;
  gyroVariance: number; // target variance magnitude per axis
  accelY: number;       // normalized, -1 = upright (standing), 0 = horizontal (crouched)
  available: boolean;
}

const SCENARIO_CONFIGS: Record<SensorScenario, FakeSensorConfig> = {
  dark_and_stable_success:   { lux: 5,   gyroVariance: 0.001, accelY: 0,    available: true },
  dark_and_unstable_fail:    { lux: 5,   gyroVariance: 0.1,   accelY: 0,    available: true },
  bright_and_stable_fail:    { lux: 500, gyroVariance: 0.001, accelY: -1.0, available: true },
  condition_breaks_at_2_9s:  { lux: 5,   gyroVariance: 0.001, accelY: 0,    available: true },
  unsupported:               { lux: 0,   gyroVariance: 0,     accelY: -1.0, available: false },
};

export function makeFakeLightSensor(scenario: SensorScenario): LightSensorAdapter {
  const cfg = SCENARIO_CONFIGS[scenario];
  return {
    isAvailable: () => Promise.resolve(cfg.available),
    subscribe: (cb) => {
      if (!cfg.available) return { unsubscribe: () => {} };
      let active = true;
      let tick = 0;

      const id = setInterval(() => {
        if (!active) return;
        tick++;
        // For condition_breaks_at_2_9s: go bright after 2900ms (29 ticks at 100ms)
        const lux =
          scenario === 'condition_breaks_at_2_9s' && tick > 29 ? 500 : cfg.lux;
        cb({ lux, timestamp: Date.now() });
      }, 100);

      return {
        unsubscribe: () => {
          active = false;
          clearInterval(id);
        },
      };
    },
  };
}

export function makeFakeGyroscope(scenario: SensorScenario): GyroscopeAdapter {
  const cfg = SCENARIO_CONFIGS[scenario];
  return {
    isAvailable: () => Promise.resolve(cfg.available),
    subscribe: (cb, intervalMs) => {
      if (!cfg.available) return { unsubscribe: () => {} };
      let active = true;
      let tick = 0;

      const id = setInterval(() => {
        if (!active) return;
        tick++;
        const noise = cfg.gyroVariance > 0 ? (Math.random() - 0.5) * cfg.gyroVariance * 2 : 0;
        const reading: GyroReading = {
          x: noise,
          y: noise * 0.8,
          z: noise * 1.2,
          timestamp: Date.now(),
        };
        cb(reading);
      }, intervalMs);

      return {
        unsubscribe: () => {
          active = false;
          clearInterval(id);
        },
      };
    },
  };
}

export function makeFakeAccelerometer(scenario: SensorScenario): AccelerometerAdapter {
  const cfg = SCENARIO_CONFIGS[scenario];
  return {
    isAvailable: () => Promise.resolve(cfg.available),
    subscribe: (cb, intervalMs) => {
      if (!cfg.available) return { unsubscribe: () => {} };
      let active = true;

      const id = setInterval(() => {
        if (!active) return;
        // Simulate gravity vector; y=-1 = upright, y~0 = horizontal
        const noise = (Math.random() - 0.5) * 0.05;
        const reading: AccelReading = {
          x: noise,
          y: cfg.accelY + noise,
          z: Math.sqrt(Math.max(0, 1 - cfg.accelY ** 2)) * -1 + noise,
          timestamp: Date.now(),
        };
        cb(reading);
      }, intervalMs);

      return {
        unsubscribe: () => {
          active = false;
          clearInterval(id);
        },
      };
    },
  };
}
