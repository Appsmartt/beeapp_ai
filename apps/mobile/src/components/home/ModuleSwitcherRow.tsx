
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing } from '@beeapp/design-system';
import { Settings } from 'lucide-react-native';
import { MODULES_POOL, OVERVIEW_MODULE_ID } from './homeModules';

interface ModuleSwitcherRowProps {
  /** User modules; the overview chip is always prepended to them */
  selectedModuleIds: string[];
  activeModuleId: string | null;
  onSelect: (id: string) => void;
  onCustomize: () => void;
}

/**
 * Horizontal chips of the user's modules: picks which module is shown
 * embedded right below, and opens the personalization selector.
 * Only the selected chip shows its name; the rest stay icon-only.
 */
export default function ModuleSwitcherRow({ selectedModuleIds, activeModuleId, onSelect, onCustomize }: ModuleSwitcherRowProps) {
  // "Todas" is always the first chip and cannot be removed or reordered
  const chipIds = [OVERVIEW_MODULE_ID, ...selectedModuleIds.filter((id) => id !== OVERVIEW_MODULE_ID)];

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {chipIds.map((id) => {
          const item = MODULES_POOL.find((m) => m.id === id);
          if (!item) return null;
          const isActive = id === activeModuleId;
          const IconComp = item.icon;
          return (
            <TouchableOpacity
              key={id}
              style={[styles.chip, isActive ? styles.chipActive : styles.chipIconOnly]}
              onPress={() => onSelect(id)}
              activeOpacity={0.7}
            >
              <IconComp size={15} color={isActive ? colors.brand.primary : colors.neutral.gray600} />
              {isActive && <Text style={styles.chipTextActive}>{item.name}</Text>}
            </TouchableOpacity>
          );
        })}

        {/* Personalization: which chips appear and in which order */}
        <TouchableOpacity style={styles.customizeChip} onPress={onCustomize} activeOpacity={0.7}>
          <Settings size={14} color={colors.neutral.gray600} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.sm,
  },
  scroll: {
    paddingHorizontal: 12,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 32,
    borderRadius: 14,
    borderWidth: 1,
  },
  chipIconOnly: {
    width: 34,
    backgroundColor: colors.neutral.gray100,
    borderColor: 'transparent',
  },
  chipActive: {
    paddingHorizontal: 12,
    backgroundColor: colors.brand.primary + '15',
    borderColor: 'transparent',
  },
  chipTextActive: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brand.primary,
  },
  customizeChip: {
    width: 34,
    height: 32,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.gray100,
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
