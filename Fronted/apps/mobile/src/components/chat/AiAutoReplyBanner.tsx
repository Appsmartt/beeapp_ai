import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Switch, Animated, Easing } from 'react-native';
import { colors, spacing } from '@beeapp/design-system';
import { Bot } from 'lucide-react-native';

interface AiAutoReplyBannerProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

/**
 * Fixed bar under the header of a seller chat: the assistant can answer the
 * customer on the seller's behalf. Mock — flipping the switch only changes
 * how the bar looks.
 */
export default function AiAutoReplyBanner({ enabled, onChange }: AiAutoReplyBannerProps) {
  const pulse = useRef(new Animated.Value(0.35)).current;

  // A soft heartbeat next to the icon while the assistant is on duty
  useEffect(() => {
    if (!enabled) {
      pulse.setValue(0.35);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [enabled]);

  const tint = enabled ? colors.brand.primary : colors.neutral.gray600;

  return (
    <View style={[styles.bar, enabled ? styles.barOn : styles.barOff]}>
      <Bot size={18} color={tint} />

      {enabled && <Animated.View style={[styles.pulseDot, { opacity: pulse }]} />}

      <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
        {enabled ? 'Asistente IA respondiendo' : 'Asistente IA desactivado'}
      </Text>

      <Switch
        value={enabled}
        onValueChange={onChange}
        trackColor={{ false: colors.neutral.gray300, true: colors.brand.primary }}
        thumbColor={colors.neutral.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 44,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
  },
  barOff: {
    backgroundColor: colors.neutral.gray100,
  },
  barOn: {
    backgroundColor: colors.brand.primary + '15',
    borderBottomColor: colors.brand.primary + '30',
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginLeft: -4,
    backgroundColor: colors.brand.primary,
  },
  label: {
    flex: 1,
    fontSize: 13,
    fontWeight: '400',
  },
});
