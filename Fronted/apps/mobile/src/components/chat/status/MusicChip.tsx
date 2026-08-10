import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radii } from '@beeapp/design-system';
import { Music, X } from 'lucide-react-native';
import { StatusMusic } from '../../../mocks/statuses';

interface MusicChipProps {
  music: StatusMusic;
  onRemove: () => void;
}

/** Chip de la canción elegida, flotando arriba del lienzo del estado */
export default function MusicChip({ music, onRemove }: MusicChipProps) {
  return (
    <View style={styles.chip}>
      <Music size={13} color={colors.neutral.white} />
      <Text style={styles.title} numberOfLines={1}>
        {music.title}
      </Text>
      <TouchableOpacity onPress={onRemove} hitSlop={8} activeOpacity={0.7}>
        <X size={13} color={colors.neutral.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '70%',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.full,
    backgroundColor: 'rgba(26, 26, 46, 0.55)',
  },
  title: { flexShrink: 1, fontSize: 12, fontWeight: '400', color: colors.neutral.white },
});
