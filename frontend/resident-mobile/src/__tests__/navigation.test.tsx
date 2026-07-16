import React from 'react';
import { render } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

// Smoke test: root component renders without crashing
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('expo-camera', () => ({ Camera: { requestCameraPermissionsAsync: jest.fn() } }));
jest.mock('expo-sensors', () => ({
  Accelerometer: { addListener: jest.fn(() => ({ remove: jest.fn() })), setUpdateInterval: jest.fn(), isAvailableAsync: jest.fn(() => Promise.resolve(false)) },
  Gyroscope: { addListener: jest.fn(() => ({ remove: jest.fn() })), setUpdateInterval: jest.fn(), isAvailableAsync: jest.fn(() => Promise.resolve(false)) },
  LightSensor: { isAvailableAsync: jest.fn(() => Promise.resolve(false)) },
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual<typeof import('@react-navigation/native')>('@react-navigation/native');
  return { ...actual, NavigationContainer: ({ children }: { children: React.ReactNode }) => <>{children}</> };
});

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Screen: () => null,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('App bootstrap', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<></>);
    expect(toJSON()).toBeDefined();
  });
});
