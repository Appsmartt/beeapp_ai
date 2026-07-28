import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { colors, spacing, radii } from '@beeapp/design-system';
import { Settings } from 'lucide-react-native';
import { MODULES_POOL, OVERVIEW_MODULE_ID, HomeModule } from './homeModules';

const CHIP_SIZE = 38;
const ICON_SIZE = 20;
const GAP = spacing.sm;
const EDGE = 12;

interface ModuleSwitcherRowProps {
  /** Order of the user modules; the overview chip is always prepended */
  selectedModuleIds: string[];
  activeModuleId: string | null;
  onSelect: (id: string) => void;
  onCustomize: () => void;
}

/** Rough width of the expanded chip, used to decide if the row needs scroll */
const activeChipWidth = (name: string) => CHIP_SIZE + name.length * 7.5;

/**
 * Horizontal chips of every module: picks which one is shown embedded right
 * below. All modules are always present — personalization only reorders them.
 * Only the selected chip shows its name; the rest stay icon-only.
 */
export default function ModuleSwitcherRow({ selectedModuleIds, activeModuleId, onSelect, onCustomize }: ModuleSwitcherRowProps) {
  const { width } = useWindowDimensions();

  // "Todas" is always the first chip and cannot be reordered
  const ordered = selectedModuleIds.filter((id) => id !== OVERVIEW_MODULE_ID);
  const rest = MODULES_POOL.filter((m) => !m.isOverview && !ordered.includes(m.id)).map((m) => m.id);
  const chips = [OVERVIEW_MODULE_ID, ...ordered, ...rest]
    .map((id) => MODULES_POOL.find((m) => m.id === id))
    .filter((item): item is HomeModule => !!item);

  // They all fit only when the expanded chip still leaves room for the rest
  const activeName = chips.find((item) => item.id === activeModuleId)?.name ?? '';
  const needed =
    (chips.length + 1) * (CHIP_SIZE + GAP) +
    (activeName ? activeChipWidth(activeName) - CHIP_SIZE : 0) +
    EDGE * 2;
  const fits = needed <= width;

  const renderChip = (item: HomeModule) => {
    const isActive = item.id === activeModuleId;
    const IconComp = item.icon;
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.chip, isActive ? styles.chipActive : styles.chipIconOnly]}
        onPress={() => onSelect(item.id)}
        activeOpacity={0.7}
      >
        <IconComp size={ICON_SIZE} color={isActive ? colors.brand.primary : colors.neutral.gray600} />
        {isActive && <Text style={styles.chipTextActive}>{item.name}</Text>}
      </TouchableOpacity>
    );
  };

  // Personalization: only changes the order of the chips
  const customizeBtn = (
    <TouchableOpacity style={styles.customizeChip} onPress={onCustomize} activeOpacity={0.7}>
      <Settings size={20} color={colors.neutral.gray600} />
    </TouchableOpacity>
  );

  // Enough room: spread the chips across the whole width, no scroll
  if (fits) {
    return (
      <View style={[styles.wrap, styles.row]}>
        {chips.map(renderChip)}
        {customizeBtn}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {chips.map(renderChip)}
        {customizeBtn}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: EDGE,
  },
  scroll: {
    paddingHorizontal: EDGE,
    gap: GAP,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: CHIP_SIZE,
    borderRadius: radii.xl,
    borderWidth: 1,
  },
  chipIconOnly: {
    width: CHIP_SIZE,
    backgroundColor: colors.neutral.gray100,
    borderColor: 'transparent',
  },
  chipActive: {
    paddingHorizontal: 14,
    backgroundColor: colors.brand.primary + '15',
    borderColor: 'transparent',
  },
  chipTextActive: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand.primary,
  },
  customizeChip: {
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.gray100,
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
