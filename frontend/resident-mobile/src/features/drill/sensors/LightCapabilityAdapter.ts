import { LightSensor } from 'expo-sensors';
import type { LightSensorAdapter, LuxReading } from './types';

export const realLightSensorAdapter: LightSensorAdapter = {
  isAvailable: () => LightSensor.isAvailableAsync(),

  subscribe: (cb) => {
    const sub = LightSensor.addListener((data) => {
      cb({ lux: data.illuminance, timestamp: Date.now() });
    });
    return {
      unsubscribe: () => sub.remove(),
    };
  },
};
