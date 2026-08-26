import {
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  MessageSquareText,
  X,
} from 'lucide-react-native';
import type {
  ChatGroupPostingPolicy,
} from '@beeapp/shared-types';
import {
  colors,
  radii,
  spacing,
} from '@beeapp/design-system';

interface EditGroupModalProps {
  visible: boolean;
  initialName: string;
  initialDescription: string | null | undefined;
  initialPostingPolicy: ChatGroupPostingPolicy | null | undefined;
  onSave: (payload: {
    name: string;
    description: string | null;
    postingPolicy: ChatGroupPostingPolicy;
  }) => Promise<void> | void;
  onClose: () => void;
}

export default function EditGroupModal({
  visible,
  initialName,
  initialDescription,
  initialPostingPolicy,
  onSave,
  onClose,
}: EditGroupModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [adminsOnly, setAdminsOnly] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setName(initialName || '');
    setDescription(initialDescription || '');
    setAdminsOnly(
      initialPostingPolicy === 'admins_only',
    );
    setSubmitting(false);
    setError(null);
  }, [
    initialDescription,
    initialName,
    initialPostingPolicy,
    visible,
  ]);

  const handleSave = async () => {
    const normalizedName = name.trim();

    if (!normalizedName) {
      setError('El nombre del grupo es obligatorio.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await onSave({
        name: normalizedName,
        description: description.trim() || null,
        postingPolicy: adminsOnly
          ? 'admins_only'
          : 'all_members',
      });

      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'No fue posible actualizar el grupo.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouch}
          onPress={onClose}
          disabled={submitting}
          activeOpacity={1}
        />

        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>
                Editar grupo
              </Text>

              <Text style={styles.subtitle}>
                Actualiza la información y quién puede escribir.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              disabled={submitting}
              activeOpacity={0.7}
              accessibilityLabel="Cerrar edición de grupo"
            >
              <X
                size={20}
                color={colors.neutral.gray600}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>
              Nombre del grupo
            </Text>

            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="Nombre del grupo"
              placeholderTextColor={colors.neutral.gray500}
              editable={!submitting}
              maxLength={120}
              autoCapitalize="sentences"
              autoCorrect
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>
              Descripción
            </Text>

            <TextInput
              style={[
                styles.textInput,
                styles.descriptionInput,
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="Descripción del grupo"
              placeholderTextColor={colors.neutral.gray500}
              editable={!submitting}
              maxLength={2000}
              multiline
              textAlignVertical="top"
              autoCapitalize="sentences"
              autoCorrect
            />
          </View>

          <View style={styles.policyCard}>
            <View style={styles.policyIcon}>
              <MessageSquareText
                size={19}
                color={colors.brand.primary}
              />
            </View>

            <View style={styles.policyTextWrap}>
              <Text style={styles.policyTitle}>
                Solo administradores pueden escribir
              </Text>

              <Text style={styles.policyDescription}>
                Si lo activas, los miembros pueden leer, pero
                solo owner y admins pueden enviar mensajes.
              </Text>
            </View>

            <Switch
              value={adminsOnly}
              onValueChange={setAdminsOnly}
              disabled={submitting}
              trackColor={{
                false: colors.neutral.gray300,
                true: colors.brand.primary,
              }}
              thumbColor={colors.neutral.white}
            />
          </View>

          <Text style={styles.policySummary}>
            {adminsOnly
              ? 'Grupo de anuncios: solo administradores escriben.'
              : 'Grupo abierto: todos los miembros pueden escribir.'}
          </Text>

          {error ? (
            <Text style={styles.errorText}>
              {error}
            </Text>
          ) : null}

          <TouchableOpacity
            style={[
              styles.saveButton,
              submitting
                ? styles.saveButtonDisabled
                : null,
            ]}
            onPress={() => {
              void handleSave();
            }}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator
                size="small"
                color={colors.neutral.white}
              />
            ) : (
              <Text style={styles.saveButtonText}>
                Guardar cambios
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(26, 26, 46, 0.4)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.neutral.text,
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.neutral.gray600,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.neutral.gray100,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  field: {
    marginTop: spacing.md,
  },
  fieldLabel: {
    color: colors.neutral.gray700,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 7,
  },
  textInput: {
    backgroundColor: colors.neutral.gray50,
    borderColor: colors.neutral.gray200,
    borderRadius: radii.lg,
    borderWidth: 1,
    color: colors.neutral.text,
    fontSize: 14,
    minHeight: 46,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  descriptionInput: {
    minHeight: 84,
  },
  policyCard: {
    alignItems: 'center',
    backgroundColor: colors.neutral.gray50,
    borderColor: colors.neutral.gray200,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: spacing.md,
    padding: 12,
  },
  policyIcon: {
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    marginRight: 10,
    width: 36,
  },
  policyTextWrap: {
    flex: 1,
    paddingRight: 8,
  },
  policyTitle: {
    color: colors.neutral.text,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  policyDescription: {
    color: colors.neutral.gray600,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 3,
  },
  policySummary: {
    color: colors.neutral.gray600,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 9,
    textAlign: 'center',
  },
  errorText: {
    color: colors.semantic.error,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
    textAlign: 'center',
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: radii.lg,
    justifyContent: 'center',
    marginTop: spacing.md,
    minHeight: 48,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.neutral.white,
    fontSize: 14,
    fontWeight: '800',
  },
});
