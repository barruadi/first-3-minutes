import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import type { Coordinate3D } from '@3minutes/contracts';
import { toArrowAngleRad } from '../ar/SpatialCoordinateAdapter';

interface Props {
  target: Coordinate3D;
  origin?: Coordinate3D;
  visible?: boolean;
}

const ORIGIN_DEFAULT: Coordinate3D = { x: 0, y: 0, z: 0 };

// Renders a neon-green directional arrow overlay pointing toward the target.
// Arrow is composed of a rectangular shaft and a triangular head using RN border tricks.
export default function ArDirectionArrow({ target, origin = ORIGIN_DEFAULT, visible = true }: Props) {
  const rotationAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const angleDeg = (toArrowAngleRad(target, origin) * 180) / Math.PI;
    Animated.spring(rotationAnim, {
      toValue: angleDeg,
      useNativeDriver: true,
      damping: 15,
      stiffness: 100,
    }).start();
  }, [target, origin, rotationAnim]);

  if (!visible) return null;

  const rotate = rotationAnim.interpolate({
    inputRange: [-360, 360],
    outputRange: ['-360deg', '360deg'],
  });

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.arrowWrapper, { transform: [{ rotate }] }]}>
        {/* Arrow head (triangle pointing up) */}
        <View style={styles.arrowHead} />
        {/* Arrow shaft */}
        <View style={styles.arrowShaft} />
      </Animated.View>
      {/* Glow ring */}
      <View style={styles.glowRing} />
    </View>
  );
}

const ARROW_COLOR = '#39FF14'; // neon green

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 140,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 120,
  },
  arrowWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 120,
  },
  arrowHead: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 22,
    borderRightWidth: 22,
    borderBottomWidth: 44,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: ARROW_COLOR,
    shadowColor: ARROW_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 10,
  },
  arrowShaft: {
    width: 14,
    height: 52,
    backgroundColor: ARROW_COLOR,
    borderRadius: 4,
    marginTop: -4,
    shadowColor: ARROW_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 10,
  },
  glowRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: ARROW_COLOR,
    opacity: 0.3,
  },
});
