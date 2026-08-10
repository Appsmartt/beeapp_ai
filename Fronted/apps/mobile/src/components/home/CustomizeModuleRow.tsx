import { View, Text, StyleSheet } from 'react-native';
// El TouchableOpacity de react-native usa el responder de JS y le roba el
// toque al pan de DraggableFlatList: dentro de la lista hay que usar el de
// gesture-handler para que el long press llegue a `drag`.
import { TouchableOpacity } from 'react-native-gesture-handler';
import { colors, spacing, radii } from '@beeapp/design-system';
import { GripVertical } from 'lucide-react-native';
import { HomeModule } from './homeModules';

interface CustomizeModuleRowProps {
  item: HomeModule;
  /** True while the row is being dragged: it floats above the rest */
  isActive: boolean;
  /** Starts the drag gesture (long press on the row or press on the grip) */
  onDrag: () => void;
}

/**
 * One draggable module row of the Home customizer: grip handle, module icon,
 * name and description. Modules are never hidden — the sheet only reorders.
 */
export default function CustomizeModuleRow({ item, isActive, onDrag }: CustomizeModuleRowProps) {
  const Icon = item.icon;

  return (
    <TouchableOpacity
      style={[styles.row, isActive && styles.rowActive]}
      onLongPress={onDrag}
      delayLongPress={180}
      // While this row is the one being dragged it stops reacting to taps
      disabled={isActive}
      activeOpacity={0.9}
    >
      <TouchableOpacity
        onPressIn={onDrag}
        // Swallows the tap so grabbing the handle never bubbles up
        onPress={() => {}}
        style={styles.gripBtn}
        activeOpacity={0.6}
        accessibilityLabel={`Arrastrar ${item.name}`}
      >
        <GripVertical size={20} color={colors.neutral.gray400} />
      </TouchableOpacity>

      <View style={[styles.iconWrap, { backgroundColor: item.bgColor }]}>
        <Icon size={20} color={item.iconColor} />
      </View>

      <View style={styles.texts}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.desc} numberOfLines={1}>
          {item.desc}
        </Text>
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
    borderColor: colors.neutral.gray200,
    backgroundColor: colors.neutral.white,
  },
  // Lifted while dragging
  rowActive: {
    opacity: 0.95,
    borderColor: colors.brand.primary,
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
    fontWeight: '600',
    color: colors.neutral.text,
    marginBottom: 2,
  },
  desc: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.neutral.gray600,
  },
});
