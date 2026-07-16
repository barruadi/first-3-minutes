import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import ErrorBoundary from './src/components/ErrorBoundary';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <NavigationContainer>
          <StatusBar style="light" backgroundColor="#0A2947" />
          <RootNavigator />
        </NavigationContainer>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
