
import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

const ORB_SIZE = 240;
const C = ORB_SIZE / 2;

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

/** Organic blob path: a circle whose radius wobbles, so it never looks perfect */
const blobPath = (radius: number, wobble: number, seed: number) => {
  const steps = 12;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const r = radius + Math.sin(a * 3 + seed) * wobble + Math.cos(a * 2 + seed * 1.7) * wobble * 0.6;
    pts.push({ x: C + Math.cos(a) * r, y: C + Math.sin(a) * r });
  }
  // Smooth closed curve through the points (quadratic midpoints)
  let d = `M ${((pts[0].x + pts[steps - 1].x) / 2).toFixed(1)} ${((pts[0].y + pts[steps - 1].y) / 2).toFixed(1)}`;
  for (let i = 0; i < steps; i++) {
    const cur = pts[i];
    const next = pts[(i + 1) % steps];
    d += ` Q ${cur.x.toFixed(1)} ${cur.y.toFixed(1)} ${((cur.x + next.x) / 2).toFixed(1)} ${((cur.y + next.y) / 2).toFixed(1)}`;
  }
  return `${d} Z`;
};

const LAYERS = [
  { d: blobPath(96, 10, 0), color: '#8B5CF6', opacity: 0.32, speed: 9000, dir: 1 },
  { d: blobPath(84, 14, 2.1), color: '#A78BFA', opacity: 0.34, speed: 6500, dir: -1 },
  { d: blobPath(70, 9, 4.3), color: '#C4B5FD', opacity: 0.4, speed: 4800, dir: 1 },
];

interface VoiceOrbProps {
  state: OrbState;
}

/**
 * Animated organic visual: layered blobs rotating at different speeds with a
 * breathing pulse. Moves more while listening/speaking, calms down when idle.
 */
export default function VoiceOrb({ state }: VoiceOrbProps) {
  const rotations = useRef(LAYERS.map(() => new Animated.Value(0))).current;
  const pulse = useRef(new Animated.Value(0)).current;

  const active = state === 'listening' || state === 'speaking';
  const speedFactor = state === 'listening' ? 0.45 : state === 'speaking' ? 0.6 : state === 'thinking' ? 0.85 : 1;

  useEffect(() => {
    const loops = LAYERS.map((layer, i) => {
      rotations[i].setValue(0);
      return Animated.loop(
        Animated.timing(rotations[i], {
          toValue: layer.dir,
          duration: layer.speed * speedFactor,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
    });
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [state]);

  useEffect(() => {
    pulse.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: active ? 700 : 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: active ? 700 : 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [state]);

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, active ? 1.12 : 1.04],
  });
  const haloOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [active ? 0.35 : 0.16, active ? 0.08 : 0.05],
  });

  return (
    <View style={styles.wrap}>
      {/* Outer glow halo */}
      <Animated.View style={[styles.halo, { opacity: haloOpacity, transform: [{ scale }] }]} />

      <Animated.View style={{ transform: [{ scale }] }}>
        {LAYERS.map((layer, i) => (
          <Animated.View
            key={i}
            style={[
              StyleSheet.absoluteFillObject,
              {
                transform: [
                  {
                    rotate: rotations[i].interpolate({
                      inputRange: [-1, 1],
                      outputRange: ['-360deg', '360deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <Svg width={ORB_SIZE} height={ORB_SIZE}>
              <Path d={layer.d} fill={layer.color} fillOpacity={layer.opacity} />
            </Svg>
          </Animated.View>
        ))}

        {/* Static core keeps the shape readable while layers rotate */}
        <Svg width={ORB_SIZE} height={ORB_SIZE}>
          <Circle cx={C} cy={C} r={46} fill="#DDD6FE" fillOpacity={0.9} />
          <Circle cx={C} cy={C} r={30} fill="#FFFFFF" fillOpacity={0.65} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    backgroundColor: '#A78BFA',
  },
});
