import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radii } from '@beeapp/design-system';
import { ImageIcon } from 'lucide-react-native';

/** Trozos en línea: **negrita**, *itálica* y [enlaces](url) */
const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]*\))/g;

function InlineText({ line }: { line: string }) {
  return (
    <>
      {line.split(INLINE).map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={index} style={styles.bold}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
          return (
            <Text key={index} style={styles.italic}>
              {part.slice(1, -1)}
            </Text>
          );
        }
        const link = /^\[([^\]]+)\]\([^)]*\)$/.exec(part);
        if (link) {
          return (
            <Text key={index} style={styles.link}>
              {link[1]}
            </Text>
          );
        }
        return <Text key={index}>{part}</Text>;
      })}
    </>
  );
}

/** Vista con formato de una nota escrita con marcadores */
export default function NoteMarkdownText({ content }: { content: string }) {
  return (
    <View style={styles.wrap}>
      {content.split('\n').map((line, index) => {
        if (/^!\[[^\]]*\]\([^)]*\)$/.test(line)) {
          return (
            <View key={index} style={styles.imageBox}>
              <ImageIcon size={22} color={colors.neutral.gray600} />
              <Text style={styles.imageLabel}>Imagen</Text>
            </View>
          );
        }

        if (line.startsWith('## ')) {
          return (
            <Text key={index} style={styles.h2}>
              <InlineText line={line.slice(3)} />
            </Text>
          );
        }

        if (line.startsWith('# ')) {
          return (
            <Text key={index} style={styles.h1}>
              <InlineText line={line.slice(2)} />
            </Text>
          );
        }

        if (line.startsWith('- ')) {
          return (
            <View key={index} style={styles.listRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.body}>
                <InlineText line={line.slice(2)} />
              </Text>
            </View>
          );
        }

        const numbered = /^(\d+)\. (.*)$/.exec(line);
        if (numbered) {
          return (
            <View key={index} style={styles.listRow}>
              <Text style={styles.bullet}>{numbered[1]}.</Text>
              <Text style={styles.body}>
                <InlineText line={numbered[2]} />
              </Text>
            </View>
          );
        }

        return (
          <Text key={index} style={styles.body}>
            <InlineText line={line} />
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  body: { flex: 1, fontSize: 14, fontWeight: '400', color: colors.neutral.text, lineHeight: 22 },
  bold: { fontWeight: '600' },
  italic: { fontStyle: 'italic' },
  link: { color: colors.brand.primary },
  h1: { fontSize: 20, fontWeight: '600', color: colors.neutral.text, marginTop: spacing.sm },
  h2: { fontSize: 17, fontWeight: '600', color: colors.neutral.text, marginTop: 6 },
  listRow: { flexDirection: 'row', gap: 8, paddingLeft: 4 },
  bullet: { fontSize: 14, fontWeight: '400', color: colors.neutral.gray600, lineHeight: 22 },
  imageBox: {
    height: 120,
    borderRadius: radii.lg,
    backgroundColor: colors.neutral.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginVertical: 4,
  },
  imageLabel: { fontSize: 11, fontWeight: '400', color: colors.neutral.gray600 },
});
