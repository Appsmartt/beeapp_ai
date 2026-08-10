import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { colors } from '@beeapp/design-system';

interface AnimatedLogoProps {
  size?: number;
  showText?: boolean;
  autoStopAfter?: number;
}

export default function AnimatedLogo({ size = 100, showText = true, autoStopAfter }: AnimatedLogoProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Constant speed rotation loop
    const rotationLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    rotationLoop.start();

    if (autoStopAfter) {
      const timer = setTimeout(() => {
        rotationLoop.stop();
        // Gently reset to 0 (default/idle position)
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
      }, autoStopAfter);

      return () => {
        clearTimeout(timer);
        rotationLoop.stop();
      };
    }

    return () => {
      rotationLoop.stop();
    };
  }, [rotateAnim, autoStopAfter]);

  // Clockwise rotation (girando a la derecha)
  const spinClockwise = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Counter-clockwise rotation (girando a la izquierda) starting with a 45 degree offset for a nicer visual pattern
  const spinCounterClockwise = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['45deg', '-315deg'],
  });

  return (
    <View style={styles.container}>
      {/* 
        The outer container size is size * 1.5 to accommodate the wings 
        which are size * 1.25 and rotate, preventing any layout clipping.
      */}
      <View style={{ width: size * 1.5, height: size * 1.5, justifyContent: 'center', alignItems: 'center' }}>
        {/* Left Wing (behind, rotating counter-clockwise, larger to protrude from the central square) */}
        <Animated.View
          style={[
            styles.wing,
            {
              width: size * 1.25,
              height: size * 1.25,
              borderRadius: size * 0.28,
              transform: [{ rotate: spinCounterClockwise }],
            },
          ]}
        />

        {/* Right Wing (behind, rotating clockwise, larger to protrude from the central square) */}
        <Animated.View
          style={[
            styles.wing,
            {
              width: size * 1.25,
              height: size * 1.25,
              borderRadius: size * 0.28,
              transform: [{ rotate: spinClockwise }],
            },
          ]}
        />

        {/* Central Square (static, white foreground, stays still, on top) */}
        <View
          style={[
            styles.centralSquare,
            {
              width: size,
              height: size,
              borderRadius: size * 0.25,
              transform: [{ rotate: '12deg' }],
            },
          ]}
        >
          {/* 2x2 grid of 4 purple squares */}
          <View
            style={{
              width: size * 0.52,
              height: size * 0.52,
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignContent: 'space-between',
            }}
          >
            <View style={[styles.gridDot, { width: size * 0.23, height: size * 0.23, borderRadius: size * 0.06 }]} />
            <View style={[styles.gridDot, { width: size * 0.23, height: size * 0.23, borderRadius: size * 0.06 }]} />
            <View style={[styles.gridDot, { width: size * 0.23, height: size * 0.23, borderRadius: size * 0.06 }]} />
            <View style={[styles.gridDot, { width: size * 0.23, height: size * 0.23, borderRadius: size * 0.06 }]} />
          </View>
        </View>
      </View>

      {showText && (
        <View style={[styles.textContainer, { marginTop: size * 0.24 }]}>
          <Text style={[styles.brandTitle, { fontSize: Math.max(18, size * 0.24) }]}>
            BeeApp AI
          </Text>
          <Text style={[styles.brandSubtitle, { fontSize: Math.max(9, size * 0.1), letterSpacing: size * 0.02 }]}>
            ECOSISTEMA INTELIGENTE
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wing: {
    position: 'absolute',
    backgroundColor: colors.brand.primary, // #6025d2
    opacity: 0.35, // Semitransparent purple so it blends elegantly
  },
  centralSquare: {
    backgroundColor: colors.neutral.white,
    justifyContent: 'center',
    alignItems: 'center',
    // Premium soft shadow to lift it above the wings
    shadowColor: colors.neutral.text,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  gridDot: {
    backgroundColor: colors.brand.primary, // #6025d2
  },
  textContainer: {
    alignItems: 'center',
  },
  brandTitle: {
    color: colors.brand.primary, // #6025d2
    fontWeight: '700',
    textAlign: 'center',
  },
  brandSubtitle: {
    color: colors.neutral.gray600, // #6C757D
    fontWeight: '400',
    marginTop: 4,
    textAlign: 'center',
  },
});
