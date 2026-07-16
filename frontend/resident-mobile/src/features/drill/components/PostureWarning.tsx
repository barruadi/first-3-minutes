import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

interface Props {
  visible: boolean;
}

// Red border + text warning that appears ≤100ms after posture violation is detected.
// Flashes to attract attention without covering the countdown.
export default function PostureWarning({ visible }: Props) {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(opacityAnim, { toValue: 1, duration: 80, useNativeDriver: true }).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 300, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [visible, opacityAnim, pulseAnim]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity: opacityAnim }]} pointerEvents="none">
      {/* Red border frame */}
      <View style={styles.border} />
      <Animated.View style={[styles.badge, { opacity: pulseAnim }]}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.text}>TETAP MERUNDUK!</Text>
        <Text style={styles.sub}>Jaga kepala di bawah 1 meter</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 80,
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 6,
    borderColor: '#D93025',
    borderRadius: 0,
  },
  badge: {
    backgroundColor: 'rgba(217,48,37,0.92)',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 4,
  },
  icon: { fontSize: 28 },
  text: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
  },
  sub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
  },
});
