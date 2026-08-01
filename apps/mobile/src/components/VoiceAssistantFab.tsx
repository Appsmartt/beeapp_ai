import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { colors } from '@beeapp/design-system';
import { Mic } from 'lucide-react-native';
import VoiceAssistantScreen from './assistant/VoiceAssistantScreen';

export default function VoiceAssistantFab() {
  const [voiceVisible, setVoiceVisible] = useState(false);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Looping pulse glow animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulseAnim]);

  // Position offsets for dragging (0,0 corresponds to left: 20, bottom: 24)
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Track drag position state for PanResponder
  const currentOffset = useRef({ x: 0, y: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4,
      onPanResponderGrant: () => {
        pan.setOffset({ x: currentOffset.current.x, y: currentOffset.current.y });
        pan.setValue({ x: 0, y: 0 });
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 1.1, duration: 150, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.7, duration: 150, useNativeDriver: true }),
        ]).start();
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 1.0, duration: 150, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 1.0, duration: 150, useNativeDriver: true }),
        ]).start();

        const isTap = Math.abs(gestureState.dx) < 6 && Math.abs(gestureState.dy) < 6;
        if (isTap) {
          setVoiceVisible(true);
          return;
        }

        // Calculate clamped and snapped final position
        const rawX = currentOffset.current.x + gestureState.dx;
        const rawY = currentOffset.current.y + gestureState.dy;

        // Boundaries: X min = 0, X max = windowWidth - 104 (right 20px)
        const maxX = windowWidth - 104;
        const minY = -(windowHeight - 160);
        const maxY = 0;

        const clampedY = Math.min(Math.max(rawY, minY), maxY);

        // Snap X to left edge (0) or right edge (maxX)
        const absoluteX = 20 + rawX;
        const targetX = absoluteX + 32 < windowWidth / 2 ? 0 : Math.max(0, maxX);

        currentOffset.current = { x: targetX, y: clampedY };

        Animated.spring(pan, {
          toValue: { x: targetX, y: clampedY },
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  return (
    <>
      <Animated.View
        style={[
          styles.fabWrapper,
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
              { scale: scaleAnim },
            ],
            opacity: opacityAnim,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Animated.View
          style={[
            styles.pulseGlow,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
        <TouchableOpacity
          style={styles.fabBtn}
          activeOpacity={0.85}
          onPress={() => setVoiceVisible(true)}
          accessibilityLabel="Asistente de IA por voz"
        >
          <Mic size={28} color={colors.neutral.white} />
        </TouchableOpacity>
      </Animated.View>

      <VoiceAssistantScreen
        visible={voiceVisible}
        onClose={() => setVoiceVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fabWrapper: {
    position: 'absolute',
    left: 20,
    bottom: 24,
    width: 64,
    height: 64,
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseGlow: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brand.primary,
    opacity: 0.3,
  },
  fabBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
});
