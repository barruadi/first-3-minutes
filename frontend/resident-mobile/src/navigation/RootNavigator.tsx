import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import ScanScreen from '../features/scan/ScanScreen';
import ModelScreen from '../features/model/ModelScreen';
import QRManagerScreen from '../features/qr/QRManagerScreen';

export type RootTabParamList = {
  Scan: undefined;
  Model: undefined;
  QRCodes: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const NAVY = '#0A2947';
const CREAM = '#F3E4C9';
const INACTIVE = 'rgba(243, 228, 201, 0.38)';

function TabIcon({ label, active }: { label: string; active: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: active ? CREAM : INACTIVE }}>
        {label}
      </Text>
    </View>
  );
}

export default function RootNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: NAVY },
        headerTintColor: CREAM,
        headerTitleStyle: { fontWeight: '700' },
        tabBarStyle: {
          backgroundColor: NAVY,
          borderTopColor: 'rgba(243, 228, 201, 0.1)',
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: CREAM,
        tabBarInactiveTintColor: INACTIVE,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          title: 'Scan',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon label="SCAN" active={focused} />,
        }}
      />
      <Tab.Screen
        name="Model"
        component={ModelScreen}
        options={{
          title: '3D Model',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon label="3D" active={focused} />,
        }}
      />
      <Tab.Screen
        name="QRCodes"
        component={QRManagerScreen}
        options={{
          title: 'QR Codes',
          headerStyle: { backgroundColor: NAVY },
          headerTintColor: CREAM,
          tabBarIcon: ({ focused }) => <TabIcon label="QR" active={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}
