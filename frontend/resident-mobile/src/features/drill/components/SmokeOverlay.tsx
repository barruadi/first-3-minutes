import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface Props {
  visible: boolean;
}

// Semi-transparent smoke overlay (~70% opacity) that fades in over 2 seconds.
// Does not block critical UI elements — rendered beneath pointer-events.
export default function SmokeOverlay({ visible }: Props) {
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: visible ? 0.72 : 0,
      duration: visible ? 2000 : 500,
      useNativeDriver: true,
    }).start();
  }, [visible, opacityAnim]);

  return (
    <Animated.View
      style={[styles.overlay, { opacity: opacityAnim }]}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#30343B',
  },
});
