export interface LuxReading {
  lux: number;
  timestamp: number;
}

export interface GyroReading {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

export interface AccelReading {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

export interface BrightnessReading {
  normalizedBrightness: number; // 0.0 (black) to 1.0 (white)
  timestamp: number;
}

export interface LightSensorAdapter {
  isAvailable: () => Promise<boolean>;
  subscribe: (cb: (r: LuxReading) => void) => { unsubscribe: () => void };
}

export interface GyroscopeAdapter {
  isAvailable: () => Promise<boolean>;
  subscribe: (cb: (r: GyroReading) => void, intervalMs: number) => { unsubscribe: () => void };
}

export interface AccelerometerAdapter {
  isAvailable: () => Promise<boolean>;
  subscribe: (cb: (r: AccelReading) => void, intervalMs: number) => { unsubscribe: () => void };
}
