import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors, spacing, radii } from '@beeapp/design-system';
import { Bold, Italic, List, ListOrdered, Heading, Link, ImagePlus } from 'lucide-react-native';

export type FormatAction =
  | 'bold'
  | 'italic'
  | 'bullet'
  | 'numbered'
  | 'heading'
  | 'link'
  | 'image';

interface NoteFormatToolbarProps {
  onAction: (action: FormatAction) => void;
  words: number;
}

const ACTIONS: { key: FormatAction; label: string; icon: typeof Bold }[] = [
  { key: 'bold', label: 'Negrita', icon: Bold },
  { key: 'italic', label: 'Itálica', icon: Italic },
  { key: 'bullet', label: 'Viñetas', icon: List },
  { key: 'numbered', label: 'Lista numerada', icon: ListOrdered },
  { key: 'heading', label: 'Título', icon: Heading },
  { key: 'link', label: 'Enlace', icon: Link },
  { key: 'image', label: 'Imagen', icon: ImagePlus },
];

/** Barra de formato fija bajo el editor de notas */
export default function NoteFormatToolbar({ onAction, words }: NoteFormatToolbarProps) {
  return (
    <View style={styles.bar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.actions}
      >
        {ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.key}
            style={styles.btn}
            onPress={() => onAction(action.key)}
            accessibilityLabel={action.label}
            activeOpacity={0.7}
          >
            <action.icon size={17} color={colors.neutral.text} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.words}>
        {words} {words === 1 ? 'palabra' : 'palabras'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.neutral.white,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.gray200,
  },
  actions: { gap: 6, alignItems: 'center' },
  btn: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    backgroundColor: colors.neutral.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  words: { fontSize: 11, fontWeight: '400', color: colors.neutral.gray600 },
});
