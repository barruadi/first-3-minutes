import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import ScanScreen from '../features/scan/ScanScreen';
import ModelScreen from '../features/model/ModelScreen';
import QRManagerScreen from '../features/qr/QRManagerScreen';

export type RootTabParamList = {
  Scan: undefined;
  Model: undefined;
  QRCodes: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function RootNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0A1A0E' },
        headerTintColor: '#39FF14',
        tabBarStyle: { backgroundColor: '#0A1A0E', borderTopColor: 'rgba(57,255,20,0.15)' },
        tabBarActiveTintColor: '#39FF14',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.35)',
      }}
    >
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          title: 'Scan',
          headerShown: false,
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⬡</Text>,
        }}
      />
      <Tab.Screen
        name="Model"
        component={ModelScreen}
        options={{
          title: '3D Model',
          headerShown: false,
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⬡</Text>,
        }}
      />
      <Tab.Screen
        name="QRCodes"
        component={QRManagerScreen}
        options={{
          title: 'QR Codes',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⊟</Text>,
        }}
      />
    </Tab.Navigator>
  );
}
