import { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@beeapp/design-system';
import Svg, { Path } from 'react-native-svg';
import AnimatedLogo from '../src/components/AnimatedLogo';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Generates an SVG path representing a periodic curved line (sinusoidal-like) over 3 * width
const getLinePath = (w: number, startY: number, amp: number) => {
  return `M 0,${startY} Q ${w * 0.25},${startY - amp} ${w * 0.5},${startY} T ${w},${startY} T ${w * 1.5},${startY} T ${w * 2},${startY} T ${w * 2.5},${startY} T ${w * 3},${startY}`;
};

export default function SplashScreen() {
  const router = useRouter();
  
  // Fade-in animation for logo, spinner, and text
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Animation values for horizontal wave movements
  const wave1Anim = useRef(new Animated.Value(0)).current;
  const wave2Anim = useRef(new Animated.Value(0)).current;
  const wave3Anim = useRef(new Animated.Value(0)).current;
  const wave4Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade-in content
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Loop Wave 1 (moving left)
    Animated.loop(
      Animated.timing(wave1Anim, {
        toValue: 1,
        duration: 16000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Loop Wave 2 (moving right)
    Animated.loop(
      Animated.timing(wave2Anim, {
        toValue: 1,
        duration: 22000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Loop Wave 3 (moving left)
    Animated.loop(
      Animated.timing(wave3Anim, {
        toValue: 1,
        duration: 18000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Loop Wave 4 (moving right)
    Animated.loop(
      Animated.timing(wave4Anim, {
        toValue: 1,
        duration: 26000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Transition to login after 2.5 seconds
    const timer = setTimeout(() => {
      router.replace('/(auth)/login');
    }, 2500);

    return () => clearTimeout(timer);
  }, [fadeAnim, wave1Anim, wave2Anim, wave3Anim, wave4Anim, router]);

  // Interpolating translations to achieve seamless infinite loops
  const wave1TranslateX = wave1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -SCREEN_WIDTH],
  });

  const wave2TranslateX = wave2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, 0],
  });

  const wave3TranslateX = wave3Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -SCREEN_WIDTH],
  });

  const wave4TranslateX = wave4Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, 0],
  });

  return (
    <View style={styles.container}>
      {/* ── Background: Flowing Trajectory Paths (Background Paths style) ── */}
      <View style={StyleSheet.absoluteFill}>
        {/* Layer 1 (Top third, rotating diagonal flow) */}
        <Animated.View
          style={[
            styles.animatedPathWrapper,
            {
              top: SCREEN_HEIGHT * 0.1,
              height: 120,
              transform: [
                { rotate: '-10deg' },
                { translateX: wave1TranslateX },
              ],
            },
          ]}
        >
          <Svg width={SCREEN_WIDTH * 3} height={120}>
            <Path
              d={getLinePath(SCREEN_WIDTH, 60, 30)}
              fill="none"
              stroke={colors.brand.primary}
              strokeWidth={1.5}
              opacity={0.07}
            />
          </Svg>
        </Animated.View>

        {/* Layer 2 (Upper-middle, flowing opposite) */}
        <Animated.View
          style={[
            styles.animatedPathWrapper,
            {
              top: SCREEN_HEIGHT * 0.32,
              height: 160,
              transform: [
                { rotate: '12deg' },
                { translateX: wave2TranslateX },
              ],
            },
          ]}
        >
          <Svg width={SCREEN_WIDTH * 3} height={160}>
            <Path
              d={getLinePath(SCREEN_WIDTH, 80, 45)}
              fill="none"
              stroke={colors.brand.dark}
              strokeWidth={2}
              opacity={0.08}
            />
          </Svg>
        </Animated.View>

        {/* Layer 3 (Lower-middle) */}
        <Animated.View
          style={[
            styles.animatedPathWrapper,
            {
              top: SCREEN_HEIGHT * 0.55,
              height: 140,
              transform: [
                { rotate: '-8deg' },
                { translateX: wave3TranslateX },
              ],
            },
          ]}
        >
          <Svg width={SCREEN_WIDTH * 3} height={140}>
            <Path
              d={getLinePath(SCREEN_WIDTH, 70, 35)}
              fill="none"
              stroke={colors.brand.primary}
              strokeWidth={2.5}
              opacity={0.06}
            />
          </Svg>
        </Animated.View>

        {/* Layer 4 (Bottom, thin line) */}
        <Animated.View
          style={[
            styles.animatedPathWrapper,
            {
              top: SCREEN_HEIGHT * 0.76,
              height: 120,
              transform: [
                { rotate: '15deg' },
                { translateX: wave4TranslateX },
              ],
            },
          ]}
        >
          <Svg width={SCREEN_WIDTH * 3} height={120}>
            <Path
              d={getLinePath(SCREEN_WIDTH, 60, 25)}
              fill="none"
              stroke={colors.brand.dark}
              strokeWidth={1}
              opacity={0.11}
            />
          </Svg>
        </Animated.View>
      </View>

      {/* ── Content Foreground ── */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Animated Logo (rotating wings visible behind, size 100, real text) */}
        <AnimatedLogo size={100} showText={true} />

        {/* Brand-colored spinner */}
        <ActivityIndicator size="large" color={colors.brand.primary} style={styles.spinner} />

        {/* Loading messages */}
        <Text style={styles.title}>Iniciando tu espacio seguro...</Text>
        <Text style={styles.subtitle}>Todo lo importante, en un solo lugar.</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Pure white background
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  animatedPathWrapper: {
    position: 'absolute',
    left: -SCREEN_WIDTH, // Center the wide path canvas to ensure no cutoff on translation
    width: SCREEN_WIDTH * 3,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    zIndex: 10,
  },
  spinner: {
    marginVertical: 32,
  },
  title: {
    color: colors.brand.primary, // Brand purple for contrast
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: colors.neutral.gray600, // Medium gray for contrast
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});
