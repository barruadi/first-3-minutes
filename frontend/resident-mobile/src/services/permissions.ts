import { Camera } from 'expo-camera';
import { Accelerometer, Gyroscope, LightSensor } from 'expo-sensors';

export type PermissionResult = 'granted' | 'denied' | 'undetermined';

export async function requestCameraPermission(): Promise<PermissionResult> {
  const { status } = await Camera.requestCameraPermissionsAsync();
  return status as PermissionResult;
}

export async function checkSensorAvailability(): Promise<{
  accelerometer: boolean;
  gyroscope: boolean;
  lightSensor: boolean;
}> {
  const [accel, gyro, light] = await Promise.all([
    Accelerometer.isAvailableAsync(),
    Gyroscope.isAvailableAsync(),
    LightSensor.isAvailableAsync().catch(() => false),
  ]);
  return { accelerometer: accel, gyroscope: gyro, lightSensor: light };
}
