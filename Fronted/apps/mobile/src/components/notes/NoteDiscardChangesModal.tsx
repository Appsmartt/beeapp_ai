import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  AlertTriangle,
  X,
} from 'lucide-react-native';
import {
  colors,
  radii,
  spacing,
} from '@beeapp/design-system';

interface NoteDiscardChangesModalProps {
  visible: boolean;
  onClose: () => void;
  onDiscard: () => void;
}

export default function NoteDiscardChangesModal({
  visible,
  onClose,
  onDiscard,
}: NoteDiscardChangesModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
        />

        <View style={styles.card}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
            accessibilityLabel="Seguir editando"
          >
            <X
              size={18}
              color={colors.neutral.gray600}
            />
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <AlertTriangle
              size={26}
              color="#B45309"
            />
          </View>

          <Text style={styles.title}>
            Descartar cambios
          </Text>

          <Text style={styles.message}>
            Los cambios que no hayas guardado se perderán.
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>
                Seguir editando
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onDiscard}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>
                Descartar
              </Text>
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
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: colors.neutral.white,
    borderColor: '#E7E1F4',
    borderRadius: radii.xl,
    borderWidth: 1,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    width: '100%',
  },
  closeButton: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: '#F4F1FA',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  iconWrap: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    borderRadius: 28,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
    width: 56,
  },
  title: {
    color: colors.neutral.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    color: colors.neutral.gray600,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.sm,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#F4F1FA',
    borderRadius: radii.lg,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: colors.brand.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#B91C1C',
    fontSize: 15,
    fontWeight: '700',
  },
});
