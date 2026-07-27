import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, radii } from '@beeapp/design-system';
import { GripVertical, Check } from 'lucide-react-native';
import { HomeModule } from './homeModules';

interface CustomizeModuleRowProps {
  item: HomeModule;
  isSelected: boolean;
  /** True while the row is being dragged: it floats above the rest */
  isActive: boolean;
  /** Starts the drag gesture (long press on the row or press on the grip) */
  onDrag: () => void;
  onToggle: () => void;
}

/**
 * One draggable module row of the Home customizer: grip handle, module icon,
 * name and description, and the on/off toggle.
 */
export default function CustomizeModuleRow({
  item,
  isSelected,
  isActive,
  onDrag,
  onToggle,
}: CustomizeModuleRowProps) {
  const Icon = item.icon;

  return (
    <TouchableOpacity
      style={[styles.row, isSelected && styles.rowSelected, isActive && styles.rowActive]}
      onPress={onToggle}
      onLongPress={onDrag}
      delayLongPress={180}
      // While this row is the one being dragged it stops reacting to taps
      disabled={isActive}
      activeOpacity={0.8}
    >
      <TouchableOpacity
        onPressIn={onDrag}
        // Swallows the tap so grabbing the handle never toggles the module
        onPress={() => {}}
        style={styles.gripBtn}
        activeOpacity={0.6}
        accessibilityLabel={`Arrastrar ${item.name}`}
      >
        <GripVertical size={20} color={colors.neutral.gray400} />
      </TouchableOpacity>

      <View style={[styles.iconWrap, { backgroundColor: isSelected ? colors.brand.primary + '15' : colors.neutral.gray100 }]}>
        <Icon size={20} color={isSelected ? colors.brand.primary : colors.neutral.gray600} />
      </View>

      <View style={styles.texts}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.desc} numberOfLines={1}>
          {item.desc}
        </Text>
      </View>

      <View style={[styles.toggle, isSelected && styles.toggleOn]}>
        {isSelected && <Check size={14} color={colors.neutral.white} strokeWidth={3} />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 12,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.neutral.gray100,
    backgroundColor: colors.neutral.gray50,
  },
  rowSelected: {
    borderColor: colors.brand.primary + '30',
    backgroundColor: colors.neutral.white,
  },
  // Lifted while dragging
  rowActive: {
    opacity: 0.95,
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  gripBtn: {
    paddingRight: spacing.sm,
    paddingVertical: spacing.xs,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  texts: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral.text,
    marginBottom: 2,
  },
  desc: {
    fontSize: 11,
    color: colors.neutral.gray600,
  },
  toggle: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.neutral.gray300,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  toggleOn: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
});
