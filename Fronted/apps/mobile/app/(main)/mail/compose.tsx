import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ChevronDown,
  ChevronLeft,
  Paperclip,
  Send,
} from 'lucide-react-native';
import {
  colors,
} from '@beeapp/design-system';

import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import {
  useModuleNav,
  useScreenParams,
} from '../../../src/components/embedded/EmbeddedNavContext';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import {
  createMailDraft,
  sendMailDraft,
} from '@beeapp/api-client';
import type {
  MailDraftRecipientPayload,
  MailIntegration,
} from '@beeapp/shared-types';

import {
  getValidSessionCredentials,
} from '../../../src/services/authSession';
import {
  getMailIntegrationLabel,
} from '../../../src/services/mailService';
import {
  useMail,
} from '../../../src/hooks/useMail';

function getErrorMessage(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : 'Inténtalo nuevamente.';
}

function parseRecipients(
  value: string,
): MailDraftRecipientPayload[] {
  const rawRecipients = value
    .split(/[,;\n]+/)
    .map((recipient) => recipient.trim())
    .filter(Boolean);

  const recipientsByEmail = new Map<
    string,
    MailDraftRecipientPayload
  >();

  rawRecipients.forEach((rawRecipient) => {
    const angleMatch = /^(.+?)\s*<([^>]+)>$/.exec(
      rawRecipient,
    );

    const email = (
      angleMatch
        ? angleMatch[2]
        : rawRecipient
    )
      .trim()
      .toLowerCase();

    if (
      !email
      || recipientsByEmail.has(email)
    ) {
      return;
    }

    const displayName = angleMatch?.[1]
      ?.trim()
      .replace(/^["']|["']$/g, '')
      || null;

    recipientsByEmail.set(email, {
      email,
      display_name: displayName,
    });
  });

  return Array.from(
    recipientsByEmail.values(),
  );
}

function isValidEmail(
  value: string,
): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value.trim(),
  );
}

function validateRecipients(
  recipients: MailDraftRecipientPayload[],
): string | null {
  const invalidRecipient = recipients.find(
    (recipient) => !isValidEmail(recipient.email),
  );

  if (invalidRecipient) {
    return (
      `La dirección "${invalidRecipient.email}" `
      + 'no es válida.'
    );
  }

  return null;
}

export default function MailComposeScreen() {
  const router = useModuleNav();
  const params = useScreenParams();

  const initialTo = String(params.to || '');
  const initialSubject = String(params.subject || '');

  const [
    senderDropdownVisible,
    setSenderDropdownVisible,
  ] = useState(false);

  const [
    selectedIntegrationId,
    setSelectedIntegrationId,
  ] = useState<string | null>(null);

  const [to, setTo] = useState(initialTo);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState('');

  const [
    showCcBcc,
    setShowCcBcc,
  ] = useState(false);

  const [sending, setSending] = useState(false);

  const {
    integrations,
    loading,
    error,
    refreshMail,
  } = useMail();

  const activeIntegrations = useMemo(() => (
    integrations.filter((integration) => (
      integration.status === 'active'
      && integration.can_sync
    ))
  ), [integrations]);

  const selectedIntegration = useMemo(() => (
    activeIntegrations.find((integration) => (
      integration.id === selectedIntegrationId
    )) || null
  ), [
    activeIntegrations,
    selectedIntegrationId,
  ]);

  useEffect(() => {
    if (
      selectedIntegrationId
      || activeIntegrations.length === 0
    ) {
      return;
    }

    setSelectedIntegrationId(
      activeIntegrations[0].id,
    );
  }, [
    activeIntegrations,
    selectedIntegrationId,
  ]);

  const senderLabel = selectedIntegration
    ? getMailIntegrationLabel(selectedIntegration)
    : 'Selecciona una cuenta';

  const handleSelectSender = useCallback((
    integration: MailIntegration,
  ) => {
    setSelectedIntegrationId(integration.id);
    setSenderDropdownVisible(false);
  }, []);

  const handleSend = useCallback(() => {
    if (sending) {
      return;
    }

    if (!selectedIntegrationId) {
      Alert.alert(
        'Selecciona una cuenta',
        (
          'Conecta o selecciona una cuenta de Google o '
          + 'Microsoft activa para enviar el correo.'
        ),
      );

      return;
    }

    const toRecipients = parseRecipients(to);
    const ccRecipients = parseRecipients(cc);
    const bccRecipients = parseRecipients(bcc);

    const recipientValidationError = validateRecipients([
      ...toRecipients,
      ...ccRecipients,
      ...bccRecipients,
    ]);

    if (recipientValidationError) {
      Alert.alert(
        'Revisa los destinatarios',
        recipientValidationError,
      );

      return;
    }

    if (toRecipients.length === 0) {
      Alert.alert(
        'Falta un destinatario',
        'Especifica al menos un destinatario en el campo Para.',
      );

      return;
    }

    setSending(true);

    void (async () => {
      try {
        const credentials = await getValidSessionCredentials();

        if (!credentials) {
          throw new Error(
            'Tu sesión expiró. Inicia sesión nuevamente.',
          );
        }

        const draftResponse = await createMailDraft(
          credentials,
          {
            integration_id: selectedIntegrationId,
            to: toRecipients,
            cc: ccRecipients,
            bcc: bccRecipients,
            subject: subject.trim() || null,
            body: body || null,
            body_content_type: 'text',
            file_ids: [],
          },
        );

        await sendMailDraft(
          credentials,
          draftResponse.message.id,
        );

        Alert.alert(
          'Correo enviado',
          'Tu correo se envió correctamente.',
          [
            {
              text: 'Aceptar',
              onPress: () => {
                router.replace('/(main)/mail');
              },
            },
          ],
        );
      } catch (sendError) {
        Alert.alert(
          'No fue posible enviar',
          getErrorMessage(sendError),
        );
      } finally {
        setSending(false);
      }
    })();
  }, [
    bcc,
    body,
    cc,
    selectedIntegrationId,
    sending,
    subject,
    to,
    router,
  ]);

  const handleAttachFile = useCallback(() => {
    Alert.alert(
      'Adjuntos próximamente',
      (
        'El envío ya está conectado. La selección de archivos '
        + 'de Storage se habilitará cuando conectemos el selector '
        + 'de archivos con el campo file_ids del backend.'
      ),
    );
  }, []);

  const handleRefreshAccounts = useCallback(() => {
    void refreshMail();
  }, [refreshMail]);

  const showNoActiveAccounts = (
    !loading
    && activeIntegrations.length === 0
  );

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            disabled={sending}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Volver a correos"
          >
            <ChevronLeft
              size={24}
              color={colors.neutral.text}
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Redactar correo
          </Text>

          <TouchableOpacity
            onPress={handleSend}
            style={styles.sendHeaderBtn}
            disabled={sending}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Enviar correo"
          >
            {sending ? (
              <ActivityIndicator
                size="small"
                color={colors.brand.primary}
              />
            ) : (
              <Send
                size={18}
                color={colors.brand.primary}
              />
            )}
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={colors.brand.primary}
            />

            <Text style={styles.loadingText}>
              Cargando cuentas de correo...
            </Text>
          </View>
        ) : showNoActiveAccounts ? (
          <View style={styles.noAccountsContainer}>
            <Text style={styles.noAccountsTitle}>
              Conecta una cuenta para enviar
            </Text>

            <Text style={styles.noAccountsText}>
              Necesitas una cuenta de Google o Microsoft activa
              con permiso de correo para redactar y enviar.
            </Text>

            {error ? (
              <Text style={styles.noAccountsError}>
                {error}
              </Text>
            ) : null}

            <TouchableOpacity
              style={styles.refreshAccountsButton}
              onPress={handleRefreshAccounts}
              activeOpacity={0.8}
            >
              <Text style={styles.refreshAccountsButtonText}>
                Reintentar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.connectAccountsButton}
              onPress={() => {
                router.push(
                  '/(main)/profile/integrations',
                );
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.connectAccountsButtonText}>
                Ir a integraciones
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.inputRow}>
              <Text style={styles.rowLabel}>
                De:
              </Text>

              <TouchableOpacity
                style={styles.senderSelectBox}
                onPress={() => {
                  setSenderDropdownVisible((visible) => !visible);
                }}
                disabled={sending}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Seleccionar cuenta remitente"
              >
                <Text
                  style={styles.senderText}
                  numberOfLines={1}
                >
                  {senderLabel}
                </Text>

                <ChevronDown
                  size={14}
                  color={colors.neutral.gray600}
                />
              </TouchableOpacity>
            </View>

            {senderDropdownVisible ? (
              <View style={styles.dropdownBox}>
                {activeIntegrations.map((integration) => {
                  const isSelected = (
                    integration.id === selectedIntegrationId
                  );

                  return (
                    <TouchableOpacity
                      key={integration.id}
                      style={[
                        styles.dropdownItem,
                        isSelected
                          && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        handleSelectSender(integration);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dropdownText,
                          isSelected
                            && styles.dropdownTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {getMailIntegrationLabel(integration)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}

            <View style={styles.inputRow}>
              <Text style={styles.rowLabel}>
                Para:
              </Text>

              <TextInput
                style={styles.textInputField}
                placeholder="correo@ejemplo.com"
                placeholderTextColor={colors.neutral.gray500}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!sending}
                value={to}
                onChangeText={setTo}
              />

              <TouchableOpacity
                onPress={() => {
                  setShowCcBcc((visible) => !visible);
                }}
                style={styles.ccBccToggleBtn}
                disabled={sending}
                activeOpacity={0.7}
              >
                <Text style={styles.ccBccToggleText}>
                  {showCcBcc ? 'Ocultar' : 'CC/CCO'}
                </Text>
              </TouchableOpacity>
            </View>

            {showCcBcc ? (
              <View style={styles.ccBccSection}>
                <View style={styles.inputRow}>
                  <Text style={styles.rowLabel}>
                    CC:
                  </Text>

                  <TextInput
                    style={styles.textInputField}
                    placeholder="copia@ejemplo.com"
                    placeholderTextColor={colors.neutral.gray500}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    editable={!sending}
                    value={cc}
                    onChangeText={setCc}
                  />
                </View>

                <View style={styles.inputRow}>
                  <Text style={styles.rowLabel}>
                    CCO:
                  </Text>

                  <TextInput
                    style={styles.textInputField}
                    placeholder="copiaoculta@ejemplo.com"
                    placeholderTextColor={colors.neutral.gray500}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    editable={!sending}
                    value={bcc}
                    onChangeText={setBcc}
                  />
                </View>
              </View>
            ) : null}

            <View style={styles.inputRow}>
              <Text style={styles.rowLabel}>
                Asunto:
              </Text>

              <TextInput
                style={styles.textInputField}
                placeholder="Asunto del correo"
                placeholderTextColor={colors.neutral.gray500}
                editable={!sending}
                value={subject}
                onChangeText={setSubject}
              />
            </View>

            <TextInput
              style={styles.bodyInputField}
              placeholder="Escribe tu correo electrónico aquí..."
              placeholderTextColor={colors.neutral.gray500}
              multiline
              editable={!sending}
              value={body}
              onChangeText={setBody}
              textAlignVertical="top"
            />

            <View style={styles.attachmentBar}>
              <TouchableOpacity
                style={styles.attachBtn}
                onPress={handleAttachFile}
                disabled={sending}
                activeOpacity={0.8}
              >
                <Paperclip
                  size={16}
                  color={colors.brand.primary}
                  style={styles.attachIcon}
                />

                <Text style={styles.attachBtnText}>
                  Adjuntar archivo
                </Text>
              </TouchableOpacity>

              <Text style={styles.attachmentHelperText}>
                Próximamente podrás elegir archivos de Storage.
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.sendButton,
                sending && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={sending}
              activeOpacity={0.8}
            >
              {sending ? (
                <ActivityIndicator
                  size="small"
                  color={colors.neutral.white}
                />
              ) : (
                <Send
                  size={17}
                  color={colors.neutral.white}
                  style={styles.sendButtonIcon}
                />
              )}

              <Text style={styles.sendButtonText}>
                {sending
                  ? 'Enviando...'
                  : 'Enviar correo'}
              </Text>
            </TouchableOpacity>

            <View style={styles.listBottomSpacing} />
          </ScrollView>
        )}

        {!router.embedded ? (
          <FloatingTabBar activeTab="home" />
        ) : null}
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.gray50,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.neutral.text,
  },
  sendHeaderBtn: {
    minWidth: 30,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.gray600,
  },
  noAccountsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  noAccountsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.neutral.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  noAccountsText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.neutral.gray600,
    textAlign: 'center',
  },
  noAccountsError: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 17,
    color: colors.semantic.error,
    textAlign: 'center',
  },
  refreshAccountsButton: {
    marginTop: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.brand.primary,
    backgroundColor: `${colors.brand.primary}10`,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  refreshAccountsButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.brand.primary,
  },
  connectAccountsButton: {
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  connectAccountsButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.neutral.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
    backgroundColor: colors.neutral.white,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  rowLabel: {
    width: 60,
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.gray600,
  },
  senderSelectBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  senderText: {
    flex: 1,
    marginRight: 8,
    fontSize: 13,
    color: colors.neutral.text,
    fontWeight: '600',
  },
  dropdownBox: {
    backgroundColor: colors.neutral.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    paddingVertical: 6,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  dropdownItemActive: {
    backgroundColor: '#F9F5FF',
  },
  dropdownText: {
    fontSize: 12,
    color: colors.neutral.text,
    fontWeight: '600',
  },
  dropdownTextActive: {
    color: colors.brand.primary,
    fontWeight: '700',
  },
  textInputField: {
    flex: 1,
    fontSize: 13,
    color: colors.neutral.text,
    paddingVertical: 2,
    fontWeight: '600',
  },
  ccBccToggleBtn: {
    marginLeft: 8,
    borderRadius: 6,
    backgroundColor: colors.neutral.gray100,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  ccBccToggleText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.neutral.gray600,
  },
  ccBccSection: {
    backgroundColor: colors.neutral.gray50,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 4,
  },
  bodyInputField: {
    minHeight: 180,
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    backgroundColor: colors.neutral.white,
    padding: 16,
    fontSize: 14,
    color: colors.neutral.text,
    fontWeight: '500',
  },
  attachmentBar: {
    marginTop: 16,
    alignItems: 'flex-start',
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  attachIcon: {
    marginRight: 6,
  },
  attachBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  attachmentHelperText: {
    marginTop: 7,
    fontSize: 11,
    color: colors.neutral.gray600,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
    borderRadius: 12,
    backgroundColor: colors.brand.primary,
    paddingVertical: 13,
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonIcon: {
    marginRight: 7,
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.neutral.white,
  },
  listBottomSpacing: {
    height: 120,
  },
});