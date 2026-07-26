
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '@beeapp/design-system';
import { Settings } from 'lucide-react-native';
import { MODULES_POOL } from './homeModules';

interface ModuleSwitcherRowProps {
  selectedModuleIds: string[];
  activeModuleId: string | null;
  onSelect: (id: string) => void;
  onCustomize: () => void;
}

/**
 * Horizontal chips of the user's modules: picks which module is shown
 * embedded right below, and opens the personalization selector.
 */
export default function ModuleSwitcherRow({ selectedModuleIds, activeModuleId, onSelect, onCustomize }: ModuleSwitcherRowProps) {
  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {selectedModuleIds.map((id) => {
          const item = MODULES_POOL.find((m) => m.id === id);
          if (!item) return null;
          const isActive = id === activeModuleId;
          const IconComp = item.icon;
          return (
            <TouchableOpacity
              key={id}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => onSelect(id)}
              activeOpacity={0.7}
            >
              <IconComp size={13} color={isActive ? colors.brand.primary : item.iconColor} />
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{item.name}</Text>
            </TouchableOpacity>
          );
        })}

        {/* Personalization: which chips appear and in which order */}
        <TouchableOpacity style={styles.customizeChip} onPress={onCustomize} activeOpacity={0.7}>
          <Settings size={14} color={colors.brand.primary} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 10,
  },
  scroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  chipActive: {
    backgroundColor: '#F3E8FF',
    borderColor: colors.brand.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.gray700,
  },
  chipTextActive: {
    color: colors.brand.primary,
    fontWeight: '700',
  },
  customizeChip: {
    width: 34,
    height: 32,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
});
