import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface Props { message?: string; }

export default function LoadingState({ message = 'Memuat...' }: Props) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#F3E4C9" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A2947', gap: 16 },
  text: { color: 'rgba(243,228,201,0.8)', fontSize: 14 },
});
