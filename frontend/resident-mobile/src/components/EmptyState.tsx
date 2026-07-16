import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props { message?: string; hint?: string; }

export default function EmptyState({ message = 'Tidak ada data', hint }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>◻</Text>
      <Text style={styles.message}>{message}</Text>
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  icon: { fontSize: 40, opacity: 0.3 },
  message: { color: '#475665', fontWeight: '500', fontSize: 15 },
  hint: { color: '#475665', fontSize: 13, opacity: 0.7, textAlign: 'center' },
});
