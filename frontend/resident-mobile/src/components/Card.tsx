import React, { type PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { theme } from '../theme';

export default function Card({ children, style, ...props }: PropsWithChildren<ViewProps>) {
  return <View style={[styles.card, style]} {...props}>{children}</View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.surfaceWhite, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, padding: 20 },
});
