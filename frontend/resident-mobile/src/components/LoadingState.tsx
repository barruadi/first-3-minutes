import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface Props { message?: string; }

export default function LoadingState({ message = 'Memuat...' }: Props) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.surfaceWarm} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary900, gap: 16 },
  text: { color: theme.colors.surfaceWarm, fontSize: 14 },
});
