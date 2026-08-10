
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { colors } from '@beeapp/design-system';
import { MODULES_POOL } from './homeModules';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface HomeQuickAccessGridProps {
  selectedModuleIds: string[];
  onItemPress: (id: string) => void;
  onCustomize: () => void;
}

export default function HomeQuickAccessGrid({ selectedModuleIds, onItemPress, onCustomize }: HomeQuickAccessGridProps) {
  return (
    <View style={styles.gridContainer}>
      {selectedModuleIds.map((id) => {
        const item = MODULES_POOL.find((m) => m.id === id);
        if (!item) return null;
        const IconComponent = item.icon;
        return (
          <TouchableOpacity
            key={id}
            style={styles.gridItem}
            onPress={() => onItemPress(id)}
            onLongPress={onCustomize}
            activeOpacity={0.7}
          >
            <View style={[styles.gridIconWrap, { backgroundColor: item.bgColor }]}>
              <IconComponent size={22} color={item.iconColor} />
            </View>
            <Text style={styles.gridLabel}>{item.name}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  gridItem: {
    width: (SCREEN_WIDTH - 40 - 24) / 3, // Perfect 3-column layout (Container padding: 40px, combined 12px gaps: 24px)
    backgroundColor: colors.neutral.white,
    borderWidth: 0,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.text,
  },
});
