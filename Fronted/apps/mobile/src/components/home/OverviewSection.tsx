import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing } from '@beeapp/design-system';
import { ChevronRight, Mail } from 'lucide-react-native';
import OverviewItem, { OverviewItemProps, FONT } from './OverviewItem';

export interface OverviewEntry extends Omit<OverviewItemProps, 'onPress' | 'showSeparator'> {
  key: string;
}

interface OverviewSectionProps {
  title: string;
  icon: typeof Mail;
  /** Module accent color, used by the section icon */
  color: string;
  items: OverviewEntry[];
  onItemPress: (entry: OverviewEntry) => void;
  onVerMasPress: () => void;
}

/**
 * One module block of the "Todas" overview: a plain header with the module
 * name and its "Ver más" shortcut, then up to five flat rows. No card, no
 * background: the section just flows with the scroll.
 */
export default function OverviewSection({
  title,
  icon: Icon,
  color,
  items,
  onItemPress,
  onVerMasPress,
}: OverviewSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Icon size={15} color={colors.neutral.gray600} />
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity style={styles.moreBtn} onPress={onVerMasPress} activeOpacity={0.7}>
          <Text style={styles.moreText}>Ver más</Text>
          <ChevronRight size={13} color={colors.brand.primary} />
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <Text style={styles.empty}>No hay nada reciente en este módulo.</Text>
      ) : (
        items.map(({ key, ...item }, index) => (
          <OverviewItem
            key={key}
            {...item}
            showSeparator={index < items.length - 1}
            onPress={() => onItemPress({ key, ...item })}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: FONT.body - 1,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  moreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.xs,
    paddingLeft: spacing.sm,
  },
  moreText: {
    fontSize: FONT.caption,
    fontWeight: '400',
    color: colors.brand.primary,
  },
  empty: {
    fontSize: FONT.caption,
    fontWeight: '400',
    color: colors.neutral.gray500,
    paddingVertical: spacing.sm,
  },
});
