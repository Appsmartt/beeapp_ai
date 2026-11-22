import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Animated,
  Easing,
  TouchableOpacity,
} from 'react-native';
import { colors, spacing } from '@beeapp/design-system';
import { Bot, PauseCircle, Play } from 'lucide-react-native';
import type { ConversationAiAutoReplyScope } from '@beeapp/shared-types';

interface AiAutoReplyBannerProps {
  enabled: boolean;
  scope?: ConversationAiAutoReplyScope | null;
  pausedUntil?: string | null;
  busy?: boolean;
  onChange: (enabled: boolean) => void;
  onResume?: () => void;
}

function formatPausedRemaining(pausedUntil?: string | null): string | null {
  if (!pausedUntil) return null;
  const target = new Date(pausedUntil).getTime();
  if (Number.isNaN(target)) return null;
  const diffMs = target - Date.now();
  if (diffMs <= 0) return null;
  const mins = Math.max(1, Math.ceil(diffMs / 60000));
  return `${mins} min`;
}

export default function AiAutoReplyBanner({
  enabled,
  scope,
  pausedUntil,
  busy = false,
  onChange,
  onResume,
}: AiAutoReplyBannerProps) {
  const pulse = useRef(new Animated.Value(0.35)).current;
  const pausedRemaining = enabled ? formatPausedRemaining(pausedUntil) : null;
  const isPaused = Boolean(pausedRemaining);
  const scopeLabel = scope === 'business' ? 'IA del negocio' : 'IA personal';

  useEffect(() => {
    if (!enabled || isPaused) {
      pulse.setValue(0.35);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [enabled, isPaused, pulse]);

  const tint = isPaused
    ? '#B45309'
    : enabled
      ? colors.brand.primary
      : colors.neutral.gray600;

  return (
    <View
      style={[
        styles.bar,
        isPaused ? styles.barPaused : enabled ? styles.barOn : styles.barOff,
      ]}
    >
      {isPaused ? (
        <PauseCircle size={17} color={tint} />
      ) : (
        <Bot size={17} color={tint} />
      )}

      {enabled && !isPaused ? (
        <Animated.View style={[styles.pulseDot, { opacity: pulse }]} />
      ) : null}

      <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
        {isPaused
          ? `${scopeLabel} en pausa (${pausedRemaining})`
          : enabled
            ? `${scopeLabel} respondiendo`
            : `${scopeLabel} desactivada`}
      </Text>

      {isPaused && onResume ? (
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={busy}
          onPress={onResume}
          style={[styles.resumeBtn, busy && { opacity: 0.55 }]}
        >
          <Play size={11} color="#FFFFFF" />
          <Text style={styles.resumeText}>Reanudar</Text>
        </TouchableOpacity>
      ) : null}

      <Switch
        value={enabled}
        disabled={busy}
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
    minHeight: 44,
    paddingVertical: 4,
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
  barPaused: {
    backgroundColor: '#FFFBEB',
    borderBottomColor: '#FDE68A',
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
    fontSize: 12.5,
    fontWeight: '500',
  },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D97706',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  resumeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
