
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, ViewStyle } from 'react-native';

interface AssistantGlowProps {
  /** Diameter of the halo in px */
  size: number;
  /** Halo color (accent) */
  color?: string;
  /** Extra style, e.g. positioning */
  style?: ViewStyle;
  /** Stronger, faster pulse (used while the assistant is active) */
  intense?: boolean;
}

/**
 * Soft pulsing halo behind the assistant buttons so they stand out.
 * Pure Animated transforms on the native driver: no extra libraries.
 */
export default function AssistantGlow({ size, color = '#8B5CF6', style, intense }: AssistantGlowProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    pulse.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: intense ? 900 : 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: intense ? 900 : 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [intense]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, intense ? 1.5 : 1.32] });
  const opacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: intense ? [0.5, 0.12] : [0.34, 0.08],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.halo,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        style,
        { opacity, transform: [{ scale }] },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  halo: {
    position: 'absolute',
  },
});
