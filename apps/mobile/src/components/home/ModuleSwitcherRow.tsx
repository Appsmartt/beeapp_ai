import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { colors, spacing, radii } from '@beeapp/design-system';
import { Settings } from 'lucide-react-native';
import {
  MODULES_POOL,
  OVERVIEW_MODULE_ID,
  HomeModule,
} from './homeModules';

const CHIP_SIZE = 38;
const ICON_SIZE = 20;
const GAP = spacing.sm;
const EDGE = 12;

interface ModuleSwitcherRowProps {
  selectedModuleIds: string[];
  activeModuleId: string | null;

  /**
   * Oculta el botón "Todas" únicamente cuando el usuario ya está
   * en el overview principal de cards.
   */
  hideOverview?: boolean;

  onSelect: (id: string) => void;
  onCustomize: () => void;
}

const activeChipWidth = (name: string) => CHIP_SIZE + name.length * 7.5;

export default function ModuleSwitcherRow({
  selectedModuleIds,
  activeModuleId,
  hideOverview = false,
  onSelect,
  onCustomize,
}: ModuleSwitcherRowProps) {
  const { width } = useWindowDimensions();

  // Se mantiene el orden personalizado del usuario, excluyendo "Todas".
  const orderedModuleIds = selectedModuleIds.filter(
    (id) => id !== OVERVIEW_MODULE_ID,
  );

  // Incluye módulos nuevos que aún no estén en el orden personalizado.
  const remainingModuleIds = MODULES_POOL
    .filter(
      (module) =>
        !module.isOverview && !orderedModuleIds.includes(module.id),
    )
    .map((module) => module.id);

  const moduleIds = [...orderedModuleIds, ...remainingModuleIds];

  /**
   * En Home / overview: no renderiza "Todas".
   * Dentro de otro módulo: agrega "Todas" como primer chip para volver
   * a la pantalla principal de cards.
   */
  const chipIds = hideOverview
    ? moduleIds
    : [OVERVIEW_MODULE_ID, ...moduleIds];

  const chips = chipIds
    .map((id) => MODULES_POOL.find((module) => module.id === id))
    .filter((item): item is HomeModule => !!item);

  const activeName =
    chips.find((item) => item.id === activeModuleId)?.name ?? '';

  const neededWidth =
    (chips.length + 1) * (CHIP_SIZE + GAP) +
    (activeName ? activeChipWidth(activeName) - CHIP_SIZE : 0) +
    EDGE * 2;

  const fitsWithoutScroll = neededWidth <= width;

  const renderChip = (item: HomeModule) => {
    const isActive = item.id === activeModuleId;
    const IconComponent = item.icon;

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.chip,
          isActive ? styles.chipActive : styles.chipIconOnly,
        ]}
        onPress={() => onSelect(item.id)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Abrir ${item.name}`}
        accessibilityState={{ selected: isActive }}
      >
        <IconComponent
          size={ICON_SIZE}
          color={
            isActive
              ? colors.brand.primary
              : colors.neutral.gray600
          }
        />

        {isActive && (
          <Text style={styles.chipTextActive}>{item.name}</Text>
        )}
      </TouchableOpacity>
    );
  };

  const customizeButton = (
    <TouchableOpacity
      style={styles.customizeChip}
      onPress={onCustomize}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel="Personalizar accesos"
    >
      <Settings size={20} color={colors.neutral.gray600} />
    </TouchableOpacity>
  );

  if (fitsWithoutScroll) {
    return (
      <View style={[styles.wrap, styles.row]}>
        {chips.map(renderChip)}
        {customizeButton}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {chips.map(renderChip)}
        {customizeButton}
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