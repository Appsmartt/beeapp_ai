import {
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ChevronLeft,
  MessageSquareText,
  Users,
} from 'lucide-react-native';
import {
  colors,
} from '@beeapp/design-system';

import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import {
  useModuleNav,
} from '../../../src/components/embedded/EmbeddedNavContext';
import {
  useChatConversations,
} from '../../../src/hooks/useChat';

export default function NewGroupScreen() {
  const router = useModuleNav();

  const {
    createGroupConversation,
  } = useChatConversations({
    autoLoad: false,
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [adminsOnly, setAdminsOnly] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const normalizedName = name.trim();
  const canSubmit = (
    Boolean(normalizedName)
    && !submitting
  );

  const openGroupProfile = (
    conversationId: string,
  ) => {
    router.replace({
      pathname: '/(main)/chat/chat-profile',
      params: {
        id: conversationId,
        newlyCreated: 'true',
      },
    });
  };

  const handleCreateGroup = async () => {
    if (!canSubmit) {
      return;
    }

    try {
      setSubmitting(true);

      const result = await createGroupConversation({
        name: normalizedName,
        description: description.trim() || null,
        postingPolicy: adminsOnly
          ? 'admins_only'
          : 'all_members',
      });

      openGroupProfile(result.conversation.id);
    } catch (createError) {
      Alert.alert(
        'No fue posible crear el grupo',
        createError instanceof Error
          ? createError.message
          : 'Inténtalo nuevamente.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
            disabled={submitting}
          >
            <ChevronLeft
              size={24}
              color={colors.neutral.text}
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Nuevo grupo
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconWrap}>
            <Users
              size={30}
              color={colors.brand.primary}
            />
          </View>

          <Text style={styles.title}>
            Crea un grupo
          </Text>

          <Text style={styles.subtitle}>
            Primero crearemos el grupo. Después podrás
            buscar e invitar cuentas privadas o comerciales.
          </Text>

          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>
              Nombre del grupo
            </Text>

            <TextInput
              style={styles.textInput}
              placeholder="Ej. Equipo BeeApp"
              placeholderTextColor={colors.neutral.gray500}
              value={name}
              onChangeText={setName}
              editable={!submitting}
              maxLength={120}
              autoCapitalize="sentences"
              autoCorrect
              returnKeyType="next"
            />

            <Text style={styles.helperText}>
              Obligatorio. Máximo 120 caracteres.
            </Text>
          </View>

          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>
              Descripción
            </Text>

            <TextInput
              style={[
                styles.textInput,
                styles.descriptionInput,
              ]}
              placeholder="Describe brevemente este grupo"
              placeholderTextColor={colors.neutral.gray500}
              value={description}
              onChangeText={setDescription}
              editable={!submitting}
              maxLength={2000}
              multiline
              textAlignVertical="top"
              autoCapitalize="sentences"
              autoCorrect
            />

            <Text style={styles.helperText}>
              Opcional. Máximo 2000 caracteres.
            </Text>
          </View>

          <View style={styles.policyCard}>
            <View style={styles.policyIcon}>
              <MessageSquareText
                size={19}
                color={colors.brand.primary}
              />
            </View>

            <View style={styles.policyContent}>
              <Text style={styles.policyTitle}>
                Solo administradores pueden escribir
              </Text>

              <Text style={styles.policyDescription}>
                Si lo activas, los miembros podrán leer y
                recibir mensajes, pero solo owner y admins
                podrán enviar mensajes.
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
              ? 'Este será un grupo de anuncios.'
              : 'Todos los miembros podrán enviar mensajes.'}
          </Text>

          <TouchableOpacity
            style={[
              styles.createButton,
              !canSubmit
                ? styles.createButtonDisabled
                : null,
            ]}
            onPress={() => {
              void handleCreateGroup();
            }}
            activeOpacity={0.8}
            disabled={!canSubmit}
          >
            <Text style={styles.createButtonText}>
              Crear grupo
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <Modal
        transparent
        visible={submitting}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          // La creación ya fue enviada al backend.
        }}
      >
        <View style={styles.loadingOverlay}>
          <View
            style={styles.loadingCard}
            accessibilityRole="progressbar"
            accessibilityLabel="Creando grupo"
          >
            <ActivityIndicator
              size="large"
              color={colors.brand.primary}
            />

            <Text style={styles.loadingTitle}>
              Creando grupo...
            </Text>

            <Text style={styles.loadingSubtitle}>
              Preparando la conversación
            </Text>
          </View>
        </View>
      </Modal>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.neutral.gray50,
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderBottomColor: colors.neutral.gray100,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    color: colors.neutral.text,
    fontSize: 16,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    paddingBottom: 44,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  iconWrap: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#F3E8FF',
    borderColor: '#DDD6FE',
    borderRadius: 28,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  title: {
    color: colors.neutral.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.neutral.gray600,
    fontSize: 13,
    lineHeight: 20,
    marginHorizontal: 10,
    marginTop: 8,
    textAlign: 'center',
  },
  fieldSection: {
    marginTop: 26,
  },
  fieldLabel: {
    color: colors.neutral.gray700,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.neutral.white,
    borderColor: colors.neutral.gray200,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.neutral.text,
    fontSize: 14,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  descriptionInput: {
    minHeight: 104,
  },
  helperText: {
    color: colors.neutral.gray500,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },
  policyCard: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderColor: colors.neutral.gray200,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 26,
    padding: 14,
  },
  policyIcon: {
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    marginRight: 11,
    width: 36,
  },
  policyContent: {
    flex: 1,
    paddingRight: 8,
  },
  policyTitle: {
    color: colors.neutral.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  policyDescription: {
    color: colors.neutral.gray600,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  policySummary: {
    color: colors.neutral.gray600,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    textAlign: 'center',
  },
  createButton: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 28,
    minHeight: 50,
  },
  createButtonDisabled: {
    backgroundColor: colors.neutral.gray400,
  },
  createButtonText: {
    color: colors.neutral.white,
    fontSize: 14,
    fontWeight: '800',
  },
  loadingOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 46, 0.36)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    elevation: 8,
    minWidth: 230,
    paddingHorizontal: 28,
    paddingVertical: 26,
    shadowColor: colors.neutral.text,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  loadingTitle: {
    color: colors.neutral.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
  },
  loadingSubtitle: {
    color: colors.neutral.gray600,
    fontSize: 12,
    marginTop: 6,
  },
});
