import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { colors, spacing } from '@beeapp/design-system';
import { Play, Check, X } from 'lucide-react-native';
import { STATUS_SONGS, StatusSong } from '../../../mocks/statusMedia';

interface MusicSelectorProps {
  visible: boolean;
  selectedId?: string;
  onSelect: (song: StatusSong) => void;
  onClose: () => void;
}

/** Hoja inferior para elegir la música de fondo del estado. Nada suena */
export default function MusicSelector({
  visible,
  selectedId,
  onSelect,
  onClose,
}: MusicSelectorProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} onPress={onClose} activeOpacity={1} />

        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Música</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={18} color={colors.neutral.gray600} />
            </TouchableOpacity>
          </View>

          <ScrollView>
            {STATUS_SONGS.map((song) => {
              const isSelected = song.id === selectedId;

              return (
                <TouchableOpacity
                  key={song.id}
                  style={styles.row}
                  onPress={() => onSelect(song)}
                  activeOpacity={0.7}
                >
                  <View style={styles.playCircle}>
                    <Play size={14} color={colors.brand.primary} />
                  </View>

                  <View style={styles.info}>
                    <Text style={styles.songTitle} numberOfLines={1}>
                      {song.title}
                    </Text>
                    <Text style={styles.artist} numberOfLines={1}>
                      {song.artist}
                    </Text>
                  </View>

                  <Text style={styles.duration}>{song.duration}</Text>
                  {isSelected && <Check size={18} color={colors.brand.primary} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(26, 26, 46, 0.35)' },
  backdropTouch: { ...StyleSheet.absoluteFillObject },
  sheet: {
    maxHeight: '65%',
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  title: { fontSize: 16, fontWeight: '600', color: colors.neutral.text },
  closeBtn: { padding: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  playCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${colors.brand.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  songTitle: { fontSize: 14, fontWeight: '400', color: colors.neutral.text },
  artist: { fontSize: 12, fontWeight: '400', color: colors.neutral.gray600, marginTop: 2 },
  duration: { fontSize: 12, fontWeight: '400', color: colors.neutral.gray600 },
});
