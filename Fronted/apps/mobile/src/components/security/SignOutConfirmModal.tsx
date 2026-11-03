import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LogOut, X } from 'lucide-react-native';
import { colors } from '@beeapp/design-system';

interface SignOutConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function SignOutConfirmModal({
  visible,
  onClose,
  onConfirm,
}: SignOutConfirmModalProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    if (submitting) {
      return;
    }

    onClose();
  };

  const handleConfirm = () => {
    if (submitting) {
      return;
    }

    setSubmitting(true);

    void (async () => {
      try {
        await onConfirm();
      } finally {
        setSubmitting(false);
      }
    })();
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={handleClose}
      transparent
      visible
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityLabel="Cerrar confirmación"
          accessibilityRole="button"
          disabled={submitting}
          onPress={handleClose}
          style={styles.backdropTap}
        />

        <View style={styles.card}>
          <TouchableOpacity
            accessibilityLabel="Cerrar"
            accessibilityRole="button"
            disabled={submitting}
            hitSlop={10}
            onPress={handleClose}
            style={styles.closeButton}
          >
            <X
              color="#5E4A83"
              size={18}
              strokeWidth={2.4}
            />
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <LogOut
              color="#B42318"
              size={26}
              strokeWidth={2.2}
            />
          </View>

          <Text style={styles.title}>
            ¿Cerrar sesión?
          </Text>

          <Text style={styles.message}>
            Saldrás de Buddy en este dispositivo. Podrás volver a entrar
            cuando quieras con tu cuenta.
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              accessibilityLabel="Cancelar cierre de sesión"
              accessibilityRole="button"
              activeOpacity={0.82}
              disabled={submitting}
              onPress={handleClose}
              style={[
                styles.cancelButton,
                submitting && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.cancelButtonText}>
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityLabel="Confirmar cierre de sesión"
              accessibilityRole="button"
              activeOpacity={0.82}
              disabled={submitting}
              onPress={handleConfirm}
              style={[
                styles.confirmButton,
                submitting && styles.buttonDisabled,
              ]}
            >
              {submitting ? (
                <ActivityIndicator
                  color="#FFFFFF"
                  size="small"
                />
              ) : (
                <Text style={styles.confirmButtonText}>
                  Cerrar sesión
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(38, 49, 77, 0.52)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  backdropTap: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F0EAF3',
    borderRadius: 24,
    borderWidth: 1,
    maxWidth: 360,
    paddingBottom: 22,
    paddingHorizontal: 22,
    paddingTop: 18,
    width: '100%',
    zIndex: 2,
  },
  closeButton: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: '#F7F8FF',
    borderColor: '#E2D6F0',
    borderRadius: 10,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  iconWrap: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#FFF0F0',
    borderColor: '#F5D0D0',
    borderRadius: 999,
    borderWidth: 1,
    height: 58,
    justifyContent: 'center',
    marginTop: 4,
    width: 58,
  },
  title: {
    color: colors.neutral.text,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 16,
    textAlign: 'center',
  },
  message: {
    color: '#6C7892',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButtonText: {
    color: '#5F52C5',
    fontSize: 14,
    fontWeight: '800',
  },
  confirmButton: {
    alignItems: 'center',
    backgroundColor: '#B42318',
    borderRadius: 14,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.72,
  },
});
