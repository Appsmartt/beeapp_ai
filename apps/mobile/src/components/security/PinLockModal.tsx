
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { colors } from '@beeapp/design-system';
import { X } from 'lucide-react-native';
import PinPad from './PinPad';
import { isPinCorrect } from '../../stores/pinStore';

interface PinLockModalProps {
  visible: boolean;
  /** Name of the element being unlocked, shown as context */
  itemName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Asks for the global 4-digit PIN before opening a protected element.
 * Validation is mock (compares against the in-memory PIN).
 */
export default function PinLockModal({ visible, itemName, onClose, onSuccess }: PinLockModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setError(null);
      setSuccess(null);
    }
  }, [visible]);

  const handleComplete = (pin: string) => {
    if (isPinCorrect(pin)) {
      setError(null);
      setSuccess('PIN correcto, abriendo...');
      setTimeout(() => {
        setSuccess(null);
        onSuccess();
      }, 500);
    } else {
      setSuccess(null);
      setError('PIN incorrecto. Inténtalo de nuevo.');
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle} numberOfLines={1}>
              {itemName ? `Contenido protegido: ${itemName}` : 'Contenido protegido'}
            </Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <X size={18} color={colors.neutral.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            <PinPad
              title="Ingresa tu PIN"
              subtitle="Este elemento está protegido. Escribe tu PIN de 4 dígitos para abrirlo."
              onComplete={handleComplete}
              error={error}
              success={success}
              footer={
                <Text style={styles.hint}>
                  ¿Olvidaste tu PIN? Recupéralo en Perfil → Seguridad.
                </Text>
              }
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 46, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.neutral.gray50,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
    maxHeight: '92%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: colors.neutral.text,
    marginRight: 12,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingTop: 20,
  },
  hint: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.gray600,
    textAlign: 'center',
    marginTop: 14,
  },
});
