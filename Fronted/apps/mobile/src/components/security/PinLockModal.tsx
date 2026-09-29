import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { colors } from '@beeapp/design-system';
import { X } from 'lucide-react-native';
import PinPad from './PinPad';

interface PinLockModalProps {
  visible: boolean;
  itemName?: string;
  onClose: () => void;
  onSuccess: (pin?: string) => void;
  verifyPin: (pin: string) => Promise<void>;
}

export default function PinLockModal({ visible, itemName, onClose, onSuccess, verifyPin }: PinLockModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setError(null);
      setSuccess(null);
    }
  }, [visible]);

  const handleComplete = async (pin: string) => {
    if (verifying) return;

    setVerifying(true);
    setError(null);
    try {
      await verifyPin(pin);
      setSuccess('PIN correcto, abriendo...');
      onSuccess(pin);
    } catch (failure) {
      setSuccess(null);
      setError(
        failure instanceof Error
          ? failure.message
          : 'No fue posible verificar el PIN. Inténtalo de nuevo.',
      );
    } finally {
      setVerifying(false);
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
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: colors.neutral.white,
    borderRadius: 24,
    width: '100%',
    maxWidth: 360,
    paddingBottom: 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.text,
    marginRight: 12,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.neutral.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingTop: 16,
  },
  hint: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.neutral.gray600,
    textAlign: 'center',
    marginTop: 14,
  },
});
