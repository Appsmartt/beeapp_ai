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
  useRef,
  useState,
} from 'react';
import * as DocumentPicker from 'expo-document-picker';
import {
  ChevronDown,
  ChevronLeft,
  Paperclip,
  Send,
  X,
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
  uploadStorageFiles,
} from '@beeapp/api-client';
import type {
  MailDraftRecipientPayload,
  MailIntegration,
  StorageFile,
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


const MAX_MAIL_ATTACHMENTS = 10;
const MAX_MAIL_ATTACHMENT_SIZE_BYTES = 3 * 1024 * 1024;
const MAX_MAIL_ATTACHMENTS_TOTAL_SIZE_BYTES = 10 * 1024 * 1024;

type RecipientField = 'to' | 'cc' | 'bcc';

interface MailAttachment {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

function getErrorMessage(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : 'Inténtalo nuevamente.';
}

function isValidEmail(
  value: string,
): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value.trim(),
  );
}

function getRecipientKey(
  email: string,
): string {
  return email.trim().toLowerCase();
}

function parseRecipientValue(
  rawValue: string,
): MailDraftRecipientPayload | null {
  const value = rawValue.trim();

  if (!value) {
    return null;
  }

  const angleMatch = /^(.+?)\s*<([^>]+)>$/.exec(value);

  const email = (
    angleMatch
      ? angleMatch[2]
      : value
  )
    .trim()
    .toLowerCase();

  if (!isValidEmail(email)) {
    return null;
  }

  const displayName = angleMatch?.[1]
    ?.trim()
    .replace(/^["']|["']$/g, '')
    || null;

  return {
    email,
    display_name: displayName,
  };
}

function parseRecipientInput(
  value: string,
): {
  validRecipients: MailDraftRecipientPayload[];
  invalidValues: string[];
} {
  const values = value
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const validRecipients: MailDraftRecipientPayload[] = [];
  const invalidValues: string[] = [];
  const seenEmails = new Set<string>();

  values.forEach((rawValue) => {
    const recipient = parseRecipientValue(rawValue);

    if (!recipient) {
      invalidValues.push(rawValue);
      return;
    }

    const key = getRecipientKey(recipient.email);

    if (seenEmails.has(key)) {
      return;
    }

    seenEmails.add(key);
    validRecipients.push(recipient);
  });

  return {
    validRecipients,
    invalidValues,
  };
}

function formatBytes(
  bytes: number,
): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getAttachmentTotalSize(
  attachments: MailAttachment[],
): number {
  return attachments.reduce(
    (total, attachment) => total + attachment.sizeBytes,
    0,
  );
}

function getInitialRecipients(
  value: string,
): MailDraftRecipientPayload[] {
  return parseRecipientInput(value).validRecipients;
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

  const [
    toRecipients,
    setToRecipients,
  ] = useState<MailDraftRecipientPayload[]>(
    () => getInitialRecipients(initialTo),
  );

  const [
    ccRecipients,
    setCcRecipients,
  ] = useState<MailDraftRecipientPayload[]>([]);

  const [
    bccRecipients,
    setBccRecipients,
  ] = useState<MailDraftRecipientPayload[]>([]);

  const [
    recipientInput,
    setRecipientInput,
  ] = useState<Record<RecipientField, string>>({
    to: '',
    cc: '',
    bcc: '',
  });

  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState('');

  const [
    showCcBcc,
    setShowCcBcc,
  ] = useState(false);

  const [
    attachments,
    setAttachments,
  ] = useState<MailAttachment[]>([]);

  const [sending, setSending] = useState(false);
  const [uploadingAttachments, setUploadingAttachments] =
    useState(false);

  const recipientInputRefs = useRef<
    Partial<Record<RecipientField, TextInput | null>>
  >({});

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

  const attachmentTotalSize = useMemo(() => (
    getAttachmentTotalSize(attachments)
  ), [attachments]);

  const handleSelectSender = useCallback((
    integration: MailIntegration,
  ) => {
    setSelectedIntegrationId(integration.id);
    setSenderDropdownVisible(false);
  }, []);

  const getRecipientsForField = useCallback((
    field: RecipientField,
  ) => {
    if (field === 'to') {
      return toRecipients;
    }

    if (field === 'cc') {
      return ccRecipients;
    }

    return bccRecipients;
  }, [
    bccRecipients,
    ccRecipients,
    toRecipients,
  ]);

  const getAllRecipientEmails = useCallback((
    excludedField?: RecipientField,
  ) => {
    const recipientsByField: Record<
      RecipientField,
      MailDraftRecipientPayload[]
    > = {
      to: toRecipients,
      cc: ccRecipients,
      bcc: bccRecipients,
    };

    const emails = new Set<string>();

    (
      Object.keys(recipientsByField) as RecipientField[]
    ).forEach((field) => {
      if (field === excludedField) {
        return;
      }

      recipientsByField[field].forEach((recipient) => {
        emails.add(getRecipientKey(recipient.email));
      });
    });

    return emails;
  }, [
    bccRecipients,
    ccRecipients,
    toRecipients,
  ]);

  const setRecipientsForField = useCallback((
    field: RecipientField,
    nextRecipients: MailDraftRecipientPayload[],
  ) => {
    if (field === 'to') {
      setToRecipients(nextRecipients);
      return;
    }

    if (field === 'cc') {
      setCcRecipients(nextRecipients);
      return;
    }

    setBccRecipients(nextRecipients);
  }, []);

  const addRecipients = useCallback((
    field: RecipientField,
    rawValue?: string,
  ): boolean => {
    const value = (
      rawValue
      ?? recipientInput[field]
    ).trim();

    if (!value) {
      return true;
    }

    const {
      validRecipients,
      invalidValues,
    } = parseRecipientInput(value);

    if (invalidValues.length > 0) {
      Alert.alert(
        'Correo no válido',
        (
          `Revisa esta dirección: "${invalidValues[0]}". `
          + 'Puedes agregar correos separados por coma, '
          + 'punto y coma o Enter.'
        ),
      );

      return false;
    }

    if (validRecipients.length === 0) {
      return true;
    }

    const currentRecipients = getRecipientsForField(field);
    const currentEmails = new Set(
      currentRecipients.map((recipient) => (
        getRecipientKey(recipient.email)
      )),
    );
    const emailsInOtherFields = getAllRecipientEmails(field);

    const duplicatedElsewhere = validRecipients.find(
      (recipient) => emailsInOtherFields.has(
        getRecipientKey(recipient.email),
      ),
    );

    if (duplicatedElsewhere) {
      Alert.alert(
        'Destinatario repetido',
        (
          `"${duplicatedElsewhere.email}" ya está en `
          + 'otro campo de destinatarios.'
        ),
      );

      return false;
    }

    const nextRecipients = [
      ...currentRecipients,
      ...validRecipients.filter((recipient) => (
        !currentEmails.has(getRecipientKey(recipient.email))
      )),
    ];

    setRecipientsForField(field, nextRecipients);

    setRecipientInput((currentInput) => ({
      ...currentInput,
      [field]: '',
    }));

    return true;
  }, [
    getAllRecipientEmails,
    getRecipientsForField,
    recipientInput,
    setRecipientsForField,
  ]);

  const removeRecipient = useCallback((
    field: RecipientField,
    email: string,
  ) => {
    const keyToRemove = getRecipientKey(email);

    setRecipientsForField(
      field,
      getRecipientsForField(field).filter((recipient) => (
        getRecipientKey(recipient.email) !== keyToRemove
      )),
    );
  }, [
    getRecipientsForField,
    setRecipientsForField,
  ]);

  const handleRecipientInputChange = useCallback((
    field: RecipientField,
    value: string,
  ) => {
    if (!/[,;\n]$/.test(value)) {
      setRecipientInput((currentInput) => ({
        ...currentInput,
        [field]: value,
      }));
      return;
    }

    const valueWithoutSeparator = value.replace(
      /[,;\n]+$/,
      '',
    );

    const added = addRecipients(
      field,
      valueWithoutSeparator,
    );

    if (!added) {
      setRecipientInput((currentInput) => ({
        ...currentInput,
        [field]: valueWithoutSeparator,
      }));
    }
  }, [addRecipients]);

  const handleRecipientSubmit = useCallback((
    field: RecipientField,
  ) => {
    const added = addRecipients(field);

    if (added) {
      recipientInputRefs.current[field]?.focus();
    }
  }, [addRecipients]);

  const handleAttachFile = useCallback(() => {
    if (
      sending
      || uploadingAttachments
    ) {
      return;
    }

    void (async () => {
      try {
        const remainingSlots = (
          MAX_MAIL_ATTACHMENTS - attachments.length
        );

        if (remainingSlots <= 0) {
          Alert.alert(
            'Límite de adjuntos',
            (
              `Puedes adjuntar máximo ${MAX_MAIL_ATTACHMENTS} `
              + 'archivos por correo.'
            ),
          );
          return;
        }

        const pickerResult = (
          await DocumentPicker.getDocumentAsync({
            type: '*/*',
            copyToCacheDirectory: true,
            multiple: true,
          })
        );

        if (
          pickerResult.canceled
          || !pickerResult.assets.length
        ) {
          return;
        }

        const selectedAssets = pickerResult.assets.slice(
          0,
          remainingSlots,
        );

        if (
          pickerResult.assets.length > remainingSlots
        ) {
          Alert.alert(
            'Algunos archivos no se seleccionaron',
            (
              `Solo se agregarán ${remainingSlots} archivo(s), `
              + `porque el máximo por correo es `
              + `${MAX_MAIL_ATTACHMENTS}.`
            ),
          );
        }

        const tooLargeAsset = selectedAssets.find(
          (asset) => (
            asset.size !== undefined
            && asset.size > MAX_MAIL_ATTACHMENT_SIZE_BYTES
          ),
        );

        if (tooLargeAsset) {
          Alert.alert(
            'Archivo demasiado grande',
            (
              `“${tooLargeAsset.name}” supera el límite de 3 MB `
              + 'por adjunto.'
            ),
          );
          return;
        }

        const selectedSize = selectedAssets.reduce(
          (total, asset) => (
            total + (asset.size || 0)
          ),
          0,
        );

        if (
          attachmentTotalSize + selectedSize
          > MAX_MAIL_ATTACHMENTS_TOTAL_SIZE_BYTES
        ) {
          Alert.alert(
            'Adjuntos demasiado grandes',
            (
              'Los adjuntos de un correo no pueden superar '
              + '10 MB en total.'
            ),
          );
          return;
        }

        setUploadingAttachments(true);

        const credentials = (
          await getValidSessionCredentials()
        );

        if (!credentials) {
          throw new Error(
            'Tu sesión expiró. Inicia sesión nuevamente.',
          );
        }

        const formData = new FormData();

        selectedAssets.forEach((asset) => {
          formData.append(
            'files',
            {
              uri: asset.uri,
              name: asset.name || 'archivo',
              type: asset.mimeType
                || 'application/octet-stream',
            } as unknown as Blob,
          );
        });

        const uploadResponse = await uploadStorageFiles(
          credentials,
          formData,
        );

        if (uploadResponse.failure_count > 0) {
          const firstFailure = uploadResponse.failed_files[0];

          Alert.alert(
            'Algunos archivos no se subieron',
            firstFailure?.detail
              || (
                `${uploadResponse.failure_count} archivo(s) `
                + 'no pudieron subirse.'
              ),
          );
        }

        if (uploadResponse.success_count === 0) {
          return;
        }

        const uploadedFiles = uploadResponse.files as StorageFile[];

        setAttachments((currentAttachments) => {
          const existingIds = new Set(
            currentAttachments.map((attachment) => (
              attachment.id
            )),
          );

          const nextAttachments = [
            ...currentAttachments,
            ...uploadedFiles
              .filter((file) => !existingIds.has(file.id))
              .map((file) => ({
                id: file.id,
                name: file.display_name
                  || file.original_name
                  || 'Archivo adjunto',
                mimeType: file.mime_type
                  || 'application/octet-stream',
                sizeBytes: file.size_bytes || 0,
              })),
          ];

          return nextAttachments.slice(
            0,
            MAX_MAIL_ATTACHMENTS,
          );
        });
      } catch (attachmentError) {
        Alert.alert(
          'No fue posible adjuntar',
          getErrorMessage(attachmentError),
        );
      } finally {
        setUploadingAttachments(false);
      }
    })();
  }, [
    attachmentTotalSize,
    attachments.length,
    sending,
    uploadingAttachments,
  ]);

  const handleRemoveAttachment = useCallback((
    attachmentId: string,
  ) => {
    setAttachments((currentAttachments) => (
      currentAttachments.filter((attachment) => (
        attachment.id !== attachmentId
      ))
    ));
  }, []);

  const commitPendingRecipients = useCallback((): boolean => {
    const fields: RecipientField[] = [
      'to',
      'cc',
      'bcc',
    ];

    for (const field of fields) {
      if (!recipientInput[field].trim()) {
        continue;
      }

      const added = addRecipients(field);

      if (!added) {
        return false;
      }
    }

    return true;
  }, [
    addRecipients,
    recipientInput,
  ]);

  const handleSend = useCallback(() => {
    if (
      sending
      || uploadingAttachments
    ) {
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

    if (!commitPendingRecipients()) {
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
            file_ids: attachments.map(
              (attachment) => attachment.id,
            ),
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
    attachments,
    bccRecipients,
    body,
    ccRecipients,
    commitPendingRecipients,
    router,
    selectedIntegrationId,
    sending,
    subject,
    toRecipients,
    uploadingAttachments,
  ]);

  const handleRefreshAccounts = useCallback(() => {
    void refreshMail();
  }, [refreshMail]);

  const showNoActiveAccounts = (
    !loading
    && activeIntegrations.length === 0
  );

  const renderRecipientField = (
    field: RecipientField,
    label: string,
    placeholder: string,
    showToggle = false,
  ) => {
    const recipients = getRecipientsForField(field);

    return (
      <View style={styles.recipientRow}>
        <Text style={styles.rowLabel}>
          {label}
        </Text>

        <View style={styles.recipientContent}>
          {recipients.length > 0 ? (
            <View style={styles.recipientChips}>
              {recipients.map((recipient) => (
                <View
                  key={recipient.email}
                  style={styles.recipientChip}
                >
                  <Text
                    style={styles.recipientChipText}
                    numberOfLines={1}
                  >
                    {recipient.display_name
                      ? `${recipient.display_name} <${recipient.email}>`
                      : recipient.email}
                  </Text>

                  <TouchableOpacity
                    onPress={() => {
                      removeRecipient(
                        field,
                        recipient.email,
                      );
                    }}
                    disabled={sending}
                    style={styles.recipientRemoveButton}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={
                      `Quitar ${recipient.email}`
                    }
                  >
                    <X
                      size={13}
                      color={colors.brand.primary}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}

          <TextInput
            ref={(input) => {
              recipientInputRefs.current[field] = input;
            }}
            style={styles.recipientTextInput}
            placeholder={placeholder}
            placeholderTextColor={colors.neutral.gray500}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            editable={!sending}
            value={recipientInput[field]}
            onChangeText={(value) => {
              handleRecipientInputChange(field, value);
            }}
            onSubmitEditing={() => {
              handleRecipientSubmit(field);
            }}
            onBlur={() => {
              if (recipientInput[field].trim()) {
                addRecipients(field);
              }
            }}
            blurOnSubmit={false}
            returnKeyType="done"
          />
        </View>

        {showToggle ? (
          <TouchableOpacity
            onPress={() => {
              setShowCcBcc((visible) => !visible);
            }}
            style={styles.ccBccToggleBtn}
            disabled={sending}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={
              showCcBcc
                ? 'Ocultar CC y CCO'
                : 'Mostrar CC y CCO'
            }
          >
            <Text style={styles.ccBccToggleText}>
              {showCcBcc ? 'Ocultar' : 'CC/CCO'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

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
            disabled={
              sending
              || uploadingAttachments
            }
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

            {renderRecipientField(
              'to',
              'Para:',
              'correo@ejemplo.com',
              true,
            )}

            {showCcBcc ? (
              <View style={styles.ccBccSection}>
                {renderRecipientField(
                  'cc',
                  'CC:',
                  'copia@ejemplo.com',
                )}

                {renderRecipientField(
                  'bcc',
                  'CCO:',
                  'copiaoculta@ejemplo.com',
                )}
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
                style={[
                  styles.attachBtn,
                  (
                    sending
                    || uploadingAttachments
                  )
                    && styles.attachBtnDisabled,
                ]}
                onPress={handleAttachFile}
                disabled={
                  sending
                  || uploadingAttachments
                }
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Adjuntar archivo"
              >
                {uploadingAttachments ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.brand.primary}
                    style={styles.attachIcon}
                  />
                ) : (
                  <Paperclip
                    size={16}
                    color={colors.brand.primary}
                    style={styles.attachIcon}
                  />
                )}

                <Text style={styles.attachBtnText}>
                  {uploadingAttachments
                    ? 'Subiendo archivos...'
                    : 'Adjuntar archivo'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.attachmentHelperText}>
                Máximo {MAX_MAIL_ATTACHMENTS} archivos, 3 MB por
                archivo y 10 MB en total.
              </Text>

              {attachments.length > 0 ? (
                <View style={styles.attachmentsList}>
                  <Text style={styles.attachmentsTitle}>
                    Adjuntos ({attachments.length}) ·{' '}
                    {formatBytes(attachmentTotalSize)}
                  </Text>

                  {attachments.map((attachment) => (
                    <View
                      key={attachment.id}
                      style={styles.attachmentItem}
                    >
                      <Paperclip
                        size={15}
                        color={colors.brand.primary}
                        style={styles.attachmentItemIcon}
                      />

                      <View style={styles.attachmentItemInfo}>
                        <Text
                          style={styles.attachmentItemName}
                          numberOfLines={1}
                        >
                          {attachment.name}
                        </Text>

                        <Text style={styles.attachmentItemMeta}>
                          {attachment.mimeType} ·{' '}
                          {formatBytes(attachment.sizeBytes)}
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => {
                          handleRemoveAttachment(attachment.id);
                        }}
                        disabled={sending}
                        style={styles.attachmentRemoveButton}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={
                          `Quitar ${attachment.name}`
                        }
                      >
                        <X
                          size={17}
                          color={colors.semantic.error}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            <TouchableOpacity
              style={[
                styles.sendButton,
                (
                  sending
                  || uploadingAttachments
                )
                  && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={
                sending
                || uploadingAttachments
              }
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
                  : uploadingAttachments
                    ? 'Esperando adjuntos...'
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
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
    backgroundColor: colors.neutral.white,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  rowLabel: {
    width: 60,
    paddingTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.gray600,
  },
  recipientContent: {
    flex: 1,
    minWidth: 0,
  },
  recipientChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  recipientChip: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingLeft: 9,
    paddingRight: 4,
    paddingVertical: 5,
  },
  recipientChipText: {
    maxWidth: 210,
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  recipientRemoveButton: {
    marginLeft: 4,
    borderRadius: 12,
    padding: 2,
  },
  recipientTextInput: {
    minHeight: 30,
    paddingVertical: 3,
    fontSize: 13,
    color: colors.neutral.text,
    fontWeight: '600',
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
  attachBtnDisabled: {
    opacity: 0.65,
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
  attachmentsList: {
    width: '100%',
    marginTop: 12,
    gap: 8,
  },
  attachmentsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.neutral.gray700,
  },
  attachmentItem: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    backgroundColor: colors.neutral.white,
    padding: 10,
  },
  attachmentItemIcon: {
    marginRight: 9,
  },
  attachmentItemInfo: {
    flex: 1,
    minWidth: 0,
  },
  attachmentItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  attachmentItemMeta: {
    marginTop: 2,
    fontSize: 10,
    color: colors.neutral.gray600,
  },
  attachmentRemoveButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: `${colors.semantic.error}10`,
    marginLeft: 8,
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