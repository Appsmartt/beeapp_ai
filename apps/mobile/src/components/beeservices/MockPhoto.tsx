import { View, StyleSheet, ViewStyle } from 'react-native';
import { getCategory } from '../../mocks/beeservices';

interface MockPhotoProps {
  /** Background tint of this photo (each listing carries its own tones) */
  tone: string;
  /** Category id: decides the icon drawn over the tile */
  categoryId: string;
  /** Icon size; the tile itself is sized by `style` */
  iconSize?: number;
  style?: ViewStyle | ViewStyle[];
}

/**
 * Stand-in for a catalogue photo: a tinted tile with the category icon and a
 * soft diagonal band. Keeps the marketplace fully offline (no remote images).
 */
export default function MockPhoto({ tone, categoryId, iconSize = 30, style }: MockPhotoProps) {
  const category = getCategory(categoryId);
  const Icon = category?.icon;
  return (
    <View style={[styles.tile, { backgroundColor: tone }, style]}>
      <View style={styles.band} />
      {Icon && <Icon size={iconSize} color={category?.color ?? '#6C757D'} />}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  band: {
    position: 'absolute',
    width: '160%',
    height: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    transform: [{ rotate: '-24deg' }],
    top: '30%',
  },
});
