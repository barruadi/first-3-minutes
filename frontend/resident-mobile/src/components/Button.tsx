import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';
import { theme } from '../theme';

type Props = PressableProps & {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'earth';
};

export default function Button({ label, loading = false, variant = 'primary', disabled, style, ...props }: Props) {
  const blocked = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: blocked, busy: loading }}
      disabled={blocked}
      style={(state) => [styles.base, styles[variant], blocked && styles.disabled, state.pressed && styles.pressed, typeof style === 'function' ? style(state) : style]}
      {...props}
    >
      {loading ? <ActivityIndicator color={variant === 'secondary' ? theme.colors.primary900 : theme.colors.textOnPrimary} /> : (
        <Text style={[styles.label, variant === 'secondary' && styles.secondaryLabel]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 52, borderRadius: 16, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: theme.colors.primary900 },
  secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.primary900 },
  earth: { backgroundColor: theme.colors.accentEarth },
  disabled: { backgroundColor: theme.colors.surfaceMuted, opacity: 0.7 },
  pressed: { opacity: 0.82 },
  label: { color: theme.colors.textOnPrimary, fontSize: 16, fontWeight: '700' },
  secondaryLabel: { color: theme.colors.primary900 },
});
