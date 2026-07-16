import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import HomeScreen from '../features/home/HomeScreen';
import ScanScreen from '../features/scan/ScanScreen';
import DrillScreen from '../features/drill/DrillScreen';
import RewardsScreen from '../features/rewards/RewardsScreen';
import HistoryScreen from '../features/history/HistoryScreen';

export type RootTabParamList = {
  Home: undefined;
  Scan: undefined;
  Drill: undefined;
  Rewards: undefined;
  History: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function RootNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0A2947' },
        headerTintColor: '#F3E4C9',
        tabBarStyle: { backgroundColor: '#0A2947', borderTopColor: 'rgba(243,228,201,0.15)' },
        tabBarActiveTintColor: '#F3E4C9',
        tabBarInactiveTintColor: 'rgba(243,228,201,0.5)',
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Beranda', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text> }} />
      <Tab.Screen name="Scan" component={ScanScreen} options={{ title: 'Scan', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📷</Text> }} />
      <Tab.Screen name="Drill" component={DrillScreen} options={{ title: 'Latihan', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🛡️</Text> }} />
      <Tab.Screen name="Rewards" component={RewardsScreen} options={{ title: 'Reward', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏅</Text> }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ title: 'Riwayat', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📋</Text> }} />
    </Tab.Navigator>
  );
}
