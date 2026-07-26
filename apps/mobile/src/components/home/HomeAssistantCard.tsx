
import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@beeapp/design-system';
import { Mic } from 'lucide-react-native';
import AssistantGlow from '../assistant/AssistantGlow';
import VoiceAssistantScreen from '../assistant/VoiceAssistantScreen';

// Compact wave: same height as the row, loops seamlessly on one period
const WAVE_HEIGHT = 26;
const WAVE_PERIOD = 26;
const WAVE_VISIBLE = 46;
const WAVE_WIDTH = WAVE_VISIBLE + WAVE_PERIOD * 2;

const buildWavePath = (amplitude: number, phase: number) => {
  const mid = WAVE_HEIGHT / 2;
  let d = `M 0 ${mid.toFixed(1)}`;
  for (let x = 0; x <= WAVE_WIDTH; x += 2) {
    const y = mid + amplitude * Math.sin((x / WAVE_PERIOD) * 2 * Math.PI + phase);
    d += ` L ${x} ${y.toFixed(1)}`;
  }
  return d;
};

const IDLE_PATHS = [
  { d: buildWavePath(4, 0), opacity: 0.9, width: 2 },
  { d: buildWavePath(6.5, 1.6), opacity: 0.4, width: 1.5 },
];

const LISTENING_PATHS = [
  { d: buildWavePath(8, 0), opacity: 0.95, width: 2 },
  { d: buildWavePath(11, 1.6), opacity: 0.45, width: 1.5 },
];

/**
 * Compact voice assistant strip: same height as the search bar, with a soft
 * glow so it stands out. Tapping it opens the immersive voice experience.
 */
export default function HomeAssistantCard() {
  const [voiceVisible, setVoiceVisible] = useState(false);
  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    waveAnim.setValue(0);
    const loop = Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: voiceVisible ? 420 : 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [voiceVisible]);

  const translateX = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -WAVE_PERIOD],
  });

  const paths = voiceVisible ? LISTENING_PATHS : IDLE_PATHS;

  return (
    <>
      <TouchableOpacity
        style={styles.row}
        onPress={() => setVoiceVisible(true)}
        activeOpacity={0.85}
      >
        {/* Small animated wave */}
        <View style={styles.waveWindow}>
          <Animated.View style={{ width: WAVE_WIDTH, transform: [{ translateX }] }}>
            <Svg width={WAVE_WIDTH} height={WAVE_HEIGHT}>
              {paths.map((p, idx) => (
                <Path
                  key={idx}
                  d={p.d}
                  stroke={colors.brand.primary}
                  strokeOpacity={p.opacity}
                  strokeWidth={p.width}
                  strokeLinecap="round"
                  fill="none"
                />
              ))}
            </Svg>
          </Animated.View>
        </View>

        <Text style={styles.prompt} numberOfLines={1}>
          ¿En qué te ayudo hoy?
        </Text>

        {/* Voice-only interaction, with a soft glow so it stands out */}
        <View style={styles.micWrap}>
          <AssistantGlow size={32} />
          <TouchableOpacity
            style={styles.micBtn}
            onPress={() => setVoiceVisible(true)}
            activeOpacity={0.8}
          >
            <Mic size={17} color={colors.neutral.white} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Immersive voice experience */}
      <VoiceAssistantScreen visible={voiceVisible} onClose={() => setVoiceVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingLeft: 10,
    paddingRight: 6,
    marginTop: 10,
    marginBottom: 12,
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  micWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveWindow: {
    width: WAVE_VISIBLE,
    height: WAVE_HEIGHT,
    overflow: 'hidden',
    marginRight: 10,
  },
  prompt: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  micBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
