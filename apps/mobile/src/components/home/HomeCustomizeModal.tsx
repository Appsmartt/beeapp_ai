
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { colors } from '@beeapp/design-system';
import { ChevronUp, ChevronDown } from 'lucide-react-native';
import { MODULES_POOL } from './homeModules';

interface HomeCustomizeModalProps {
  visible: boolean;
  selectedIds: string[];
  onChangeSelected: (ids: string[]) => void;
  onCancel: () => void;
  onSave: () => void;
}

export default function HomeCustomizeModal({ visible, selectedIds, onChangeSelected, onCancel, onSave }: HomeCustomizeModalProps) {
  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChangeSelected(selectedIds.filter((x) => x !== id));
    } else {
      onChangeSelected([...selectedIds, id]);
    }
  };

  const move = (id: string, dir: -1 | 1) => {
    const idx = selectedIds.indexOf(id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= selectedIds.length) return;
    const next = [...selectedIds];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChangeSelected(next);
  };

  return (
    <Modal transparent visible={visible} animationType="slide">
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Personalizar Accesos</Text>
            <Text style={styles.modalSubtitle}>
              Elige qué módulos ves en el inicio y en qué orden. Puedes activarlos todos.
            </Text>
            <Text style={styles.selectionCounter}>
              {selectedIds.length} de {MODULES_POOL.length} activos
            </Text>
          </View>

          <ScrollView style={styles.modulesScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.modulesModalList}>
              {MODULES_POOL.map((item) => {
                const orderIdx = selectedIds.indexOf(item.id);
                const isSelected = orderIdx >= 0;
                const IconComponent = item.icon;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.modalModuleItem, isSelected && styles.modalModuleItemActive]}
                    onPress={() => toggle(item.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.modalModuleIconWrap, { backgroundColor: item.bgColor }]}>
                      <IconComponent size={20} color={item.iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalModuleName}>{item.name}</Text>
                      <Text style={styles.modalModuleDesc}>{item.desc}</Text>
                    </View>

                    {isSelected ? (
                      <View style={styles.orderControls}>
                        <TouchableOpacity
                          style={[styles.orderBtn, orderIdx === 0 && styles.orderBtnDisabled]}
                          onPress={() => move(item.id, -1)}
                          disabled={orderIdx === 0}
                          activeOpacity={0.7}
                        >
                          <ChevronUp size={14} color={orderIdx === 0 ? colors.neutral.gray400 : colors.brand.primary} />
                        </TouchableOpacity>
                        <View style={styles.orderBadge}>
                          <Text style={styles.orderBadgeText}>{orderIdx + 1}</Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.orderBtn, orderIdx === selectedIds.length - 1 && styles.orderBtnDisabled]}
                          onPress={() => move(item.id, 1)}
                          disabled={orderIdx === selectedIds.length - 1}
                          activeOpacity={0.7}
                        >
                          <ChevronDown size={14} color={orderIdx === selectedIds.length - 1 ? colors.neutral.gray400 : colors.brand.primary} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.checkboxCircle} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onCancel} activeOpacity={0.7}>
              <Text style={styles.modalCancelBtnText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalSaveBtn, selectedIds.length === 0 && styles.modalSaveBtnDisabled]}
              disabled={selectedIds.length === 0}
              onPress={onSave}
              activeOpacity={0.8}
            >
              <Text style={styles.modalSaveBtnText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 46, 0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
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
  },
  selectionCounter: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brand.primary,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modulesScroll: {
    marginBottom: 20,
  },
  modulesModalList: {
    gap: 12,
  },
  modalModuleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    backgroundColor: colors.neutral.white,
  },
  modalModuleItemActive: {
    borderColor: colors.brand.primary,
    backgroundColor: '#FBFBFF',
  },
  modalModuleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalModuleName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.text,
    marginBottom: 2,
  },
  modalModuleDesc: {
    fontSize: 11,
    color: colors.neutral.gray600,
  },
  orderControls: {
    alignItems: 'center',
    marginLeft: 12,
    gap: 2,
  },
  orderBtn: {
    width: 24,
    height: 20,
    borderRadius: 6,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBtnDisabled: {
    backgroundColor: colors.neutral.gray100,
  },
  orderBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBadgeText: {
    color: colors.neutral.white,
    fontSize: 10,
    fontWeight: '800',
  },
  checkboxCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.neutral.gray300,
    marginLeft: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.gray200,
    paddingTop: 16,
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
    fontWeight: '700',
    color: colors.neutral.gray700,
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: colors.brand.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalSaveBtnDisabled: {
    backgroundColor: colors.neutral.gray400,
  },
  modalSaveBtnText: {
    color: colors.neutral.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
