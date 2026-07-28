import { View, StyleSheet, Animated } from 'react-native';
import { colors, radii } from '@beeapp/design-system';

interface StatusProgressPillsProps {
  count: number;
  index: number;
  /** 0 → 1 of the status currently on screen */
  progress: Animated.Value;
  /** Light content sits on a dark background */
  onDark: boolean;
}

/** Pill-shaped progress bars, one per status of the sequence */
export default function StatusProgressPills({ count, index, progress, onDark }: StatusProgressPillsProps) {
  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const doneColor = onDark ? 'rgba(255, 255, 255, 0.85)' : colors.neutral.gray400;
  const trackColor = onDark ? 'rgba(255, 255, 255, 0.28)' : colors.neutral.gray200;

  return (
    <View style={styles.row}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.track, { backgroundColor: trackColor }]}>
          {i < index && <View style={[styles.fill, { backgroundColor: doneColor }]} />}
          {i === index && <Animated.View style={[styles.fill, styles.fillActive, { width }]} />}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 20,
    marginTop: 12,
  },
  track: {
    flex: 1,
    height: 4,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    width: '100%',
    borderRadius: radii.full,
  },
  fillActive: {
    backgroundColor: colors.brand.primary,
  },
});
