import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { colors, spacing, radii } from '@beeapp/design-system';
import { Check } from 'lucide-react-native';

/** How long a message survives before it disappears (mock) */
export type DisappearingInterval = '30m' | '1h' | '6h' | '24h' | '7d';

export const DISAPPEARING_OPTIONS: { id: DisappearingInterval; label: string }[] = [
  { id: '30m', label: '30 minutos' },
  { id: '1h', label: '1 hora' },
  { id: '6h', label: '6 horas' },
  { id: '24h', label: '24 horas' },
  { id: '7d', label: '7 días' },
];

/** Subtitle shown on the privacy row, e.g. "Cada 1 hora" */
export const disappearingLabel = (interval: DisappearingInterval) =>
  `Cada ${DISAPPEARING_OPTIONS.find((o) => o.id === interval)?.label ?? ''}`;

interface DisappearingMessagesModalProps {
  visible: boolean;
  value: DisappearingInterval;
  onSave: (interval: DisappearingInterval) => void;
  onClose: () => void;
}

/** Bottom sheet to pick how often the messages of this chat disappear */
export default function DisappearingMessagesModal({ visible, value, onSave, onClose }: DisappearingMessagesModalProps) {
  const [selected, setSelected] = useState<DisappearingInterval>(value);

  // Reopening the sheet starts from the interval currently in use
  useEffect(() => {
    if (visible) setSelected(value);
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} onPress={onClose} activeOpacity={1} />

        <View style={styles.sheet}>
          <Text style={styles.title}>Mensajes temporales</Text>
          <Text style={styles.subtitle}>
            Los mensajes se eliminarán automáticamente después del tiempo seleccionado.
          </Text>

          {DISAPPEARING_OPTIONS.map((option) => {
            const isSelected = selected === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={styles.option}
                onPress={() => setSelected(option.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.optionLabel}>{option.label}</Text>
                {isSelected && <Check size={18} color={colors.brand.primary} />}
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity style={styles.saveBtn} onPress={() => onSave(selected)} activeOpacity={0.8}>
            <Text style={styles.saveBtnText}>Guardar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 46, 0.4)',
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray600,
    lineHeight: 17,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  saveBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.brand.primary,
    borderRadius: radii.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.white,
  },
});
