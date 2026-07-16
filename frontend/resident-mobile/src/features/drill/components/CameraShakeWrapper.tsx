import React, { useEffect, useRef, useCallback } from 'react';
import { Animated, StyleSheet } from 'react-native';

interface Props {
  active: boolean;
  children: React.ReactNode;
}

// Applies bounded random shake to children during earthquake phase.
// Offsets are bounded (±8px) so instruction text remains readable.
export default function CameraShakeWrapper({ active, children }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  const buildLoop = useCallback(() => {
    const steps = Array.from({ length: 12 }, () =>
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: (Math.random() - 0.5) * 16,
          duration: 60 + Math.random() * 60,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: (Math.random() - 0.5) * 16,
          duration: 60 + Math.random() * 60,
          useNativeDriver: true,
        }),
      ]),
    );
    return Animated.sequence([
      ...steps,
      // Return to center
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 80, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 80, useNativeDriver: true }),
      ]),
    ]);
  }, [translateX, translateY]);

  useEffect(() => {
    if (active) {
      const run = () => {
        loopRef.current = buildLoop();
        loopRef.current.start(({ finished }) => {
          if (finished && active) run();
        });
      };
      run();
    } else {
      loopRef.current?.stop();
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }

    return () => {
      loopRef.current?.stop();
    };
  }, [active, buildLoop, translateX, translateY]);

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { transform: [{ translateX }, { translateY }] }]}
    >
      {children}
    </Animated.View>
  );
}
