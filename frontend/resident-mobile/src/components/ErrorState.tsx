import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Button from './Button';
import { theme } from '../theme';

export default function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <View accessibilityRole="alert" style={styles.root}>
    <Text style={styles.title}>Terjadi kendala</Text><Text style={styles.message}>{message}</Text>
    {onRetry && <Button label="Coba lagi" variant="secondary" onPress={onRetry} />}
  </View>;
}
const styles = StyleSheet.create({ root: { gap: 12, padding: 20, alignItems: 'center' }, title: { color: theme.colors.error, fontSize: 18, fontWeight: '700' }, message: { color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 21 } });
