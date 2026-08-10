
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { colors, spacing } from '@beeapp/design-system';
import { CUSTOMIZABLE_MODULES, HomeModule } from './homeModules';
import CustomizeModuleRow from './CustomizeModuleRow';

interface HomeCustomizeModalProps {
  visible: boolean;
  selectedIds: string[];
  onChangeSelected: (ids: string[]) => void;
  onCancel: () => void;
  onSave: () => void;
}

/** Current chip order, completed with any module missing from it */
const buildOrder = (selectedIds: string[]) => {
  const known = selectedIds.filter((id) => CUSTOMIZABLE_MODULES.some((m) => m.id === id));
  const rest = CUSTOMIZABLE_MODULES.map((m) => m.id).filter((id) => !known.includes(id));
  return [...known, ...rest];
};

/**
 * Home customizer: drag the modules to reorder the chips. No module can be
 * hidden, and "Todas" is not listed here — it is always the first chip.
 */
export default function HomeCustomizeModal({ visible, selectedIds, onChangeSelected, onCancel, onSave }: HomeCustomizeModalProps) {
  const [order, setOrder] = useState<string[]>(() => buildOrder(selectedIds));

  // Reopening the sheet starts from the order the chips have right now
  useEffect(() => {
    if (visible) setOrder(buildOrder(selectedIds));
  }, [visible]);

  const data = order
    .map((id) => CUSTOMIZABLE_MODULES.find((m) => m.id === id))
    .filter((m): m is HomeModule => !!m);

  const handleDragEnd = (next: HomeModule[]) => {
    const nextOrder = next.map((m) => m.id);
    setOrder(nextOrder);
    onChangeSelected(nextOrder);
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<HomeModule>) => (
    <ScaleDecorator activeScale={1.03}>
      <CustomizeModuleRow item={item} isActive={isActive} onDrag={drag} />
    </ScaleDecorator>
  );

  return (
    <Modal transparent visible={visible} animationType="slide">
      {/* The modal is its own window: gestures need their own root here */}
      <GestureHandlerRootView style={styles.gestureRoot}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Personalizar Accesos</Text>
            <Text style={styles.modalSubtitle}>
              Mantén presionado un módulo y arrástralo para cambiar el orden de los accesos del inicio.
            </Text>
            <Text style={styles.selectionCounter}>
              {CUSTOMIZABLE_MODULES.length} módulos siempre visibles
            </Text>
          </View>

          <DraggableFlatList
            data={data}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            onDragEnd={({ data: next }) => handleDragEnd(next)}
            style={styles.modulesScroll}
            showsVerticalScrollIndicator={false}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onCancel} activeOpacity={0.7}>
              <Text style={styles.modalCancelBtnText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalSaveBtn} onPress={onSave} activeOpacity={0.8}>
              <Text style={styles.modalSaveBtnText}>Guardar</Text>
            </TouchableOpacity>
          </View>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 46, 0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.neutral.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.neutral.gray600,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 17,
  },
  selectionCounter: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.brand.primary,
    backgroundColor: colors.brand.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modulesScroll: {
    marginBottom: spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.gray200,
    paddingTop: spacing.md,
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral.gray700,
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: colors.brand.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalSaveBtnText: {
    color: colors.neutral.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
