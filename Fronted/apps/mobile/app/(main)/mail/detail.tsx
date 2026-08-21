import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
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
  Archive,
  ChevronLeft,
  CornerUpLeft,
  CornerUpRight,
  Download,
  FileText,
  Mail,
  ReplyAll,
  Star,
  Trash2,
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
  useMail,
} from '../../../src/hooks/useMail';
import type {
  MailDetailModel,
} from '../../../src/services/mailService';

function getErrorMessage(
  error: unknown,
  fallback = 'Inténtalo nuevamente.',
): string {
  return error instanceof Error
    ? error.message
    : fallback;
}

function getInitials(
  name: string,
): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length >= 2) {
    return (
      parts[0][0]
      + parts[1][0]
    ).toUpperCase();
  }

  return name.slice(0, 2).toUpperCase() || '?';
}

function formatDetailDate(
  value: string | null,
): string {
  if (!value) {
    return 'Fecha no disponible';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Fecha no disponible';
  }

  return new Intl.DateTimeFormat(
    'es-CO',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    },
  ).format(parsedDate);
}

function getRecipientLabel(
  email: MailDetailModel,
): string {
  const recipients = email.recipients.filter((recipient) => (
    recipient.recipient_type === 'to'
  ));

  if (recipients.length === 0) {
    return 'Para: mí';
  }

  const firstRecipient = recipients[0];

  const firstLabel = (
    firstRecipient.display_name
    || firstRecipient.email
    || 'Destinatario'
  );

  if (recipients.length === 1) {
    return `Para: ${firstLabel}`;
  }

  return (
    `Para: ${firstLabel} y `
    + `${recipients.length - 1} más`
  );
}

function getReplyRecipient(
  email: MailDetailModel,
): string {
  const replyToRecipient = email.recipients.find((recipient) => (
    recipient.recipient_type === 'reply_to'
    && recipient.email
  ));

  return (
    replyToRecipient?.email
    || email.senderEmail
    || ''
  ).trim();
}

function getReplyAllRecipients(
  email: MailDetailModel,
): string {
  const recipients = email.recipients
    .filter((recipient) => (
      (
        recipient.recipient_type === 'to'
        || recipient.recipient_type === 'cc'
        || recipient.recipient_type === 'reply_to'
      )
      && recipient.email
    ))
    .map((recipient) => recipient.email?.trim() || '')
    .filter(Boolean);

  const sender = getReplyRecipient(email);

  const allRecipients = [
    sender,
    ...recipients,
  ];

  return Array.from(
    new Set(
      allRecipients.map((recipient) => (
        recipient.toLowerCase()
      )),
    ),
  ).join(', ');
}

function getAttachmentDescription(
  mimeType: string | null,
  sizeBytes: number | null,
): string {
  const typeLabel = mimeType?.trim()
    ? mimeType
    : 'Archivo';

  if (
    sizeBytes === null
    || sizeBytes === undefined
    || sizeBytes < 0
  ) {
    return typeLabel;
  }

  if (sizeBytes < 1024) {
    return `${typeLabel} · ${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return (
      `${typeLabel} · `
      + `${Math.round(sizeBytes / 1024)} KB`
    );
  }

  return (
    `${typeLabel} · `
    + `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
  );
}

function getMailBody(
  email: MailDetailModel,
): string {
  const body = email.body.trim();

  if (body) {
    return body;
  }

  const preview = email.bodyPreview.trim();

  if (preview) {
    return preview;
  }

  return 'Este correo no contiene texto disponible.';
}

export default function MailDetailScreen() {
  const router = useModuleNav();
  const params = useScreenParams();

  const messageId = String(
    params.id
    || params.messageId
    || '',
  ).trim();

  const [
    email,
    setEmail,
  ] = useState<MailDetailModel | null>(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    actionLoading,
    setActionLoading,
  ] = useState(false);

  const [
    loadError,
    setLoadError,
  ] = useState<string | null>(null);

  const {
    getMessageById,
    updateMessageState,
    archiveMessage,
    trashMessage,
    restoreMessage,
  } = useMail({
    autoLoad: false,
  });

  const loadEmail = useCallback(async () => {
    if (!messageId) {
      setEmail(null);
      setLoadError(
        'No fue posible identificar el correo.',
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const loadedEmail = await getMessageById(messageId);

      setEmail(loadedEmail);

      if (!loadedEmail.isRead) {
        try {
          const updatedMessage = await updateMessageState(
            messageId,
            {
              is_read: true,
            },
          );

          setEmail((currentEmail) => (
            currentEmail
              ? {
                ...currentEmail,
                isRead: updatedMessage.is_read,
              }
              : currentEmail
          ));
        } catch {
          setEmail((currentEmail) => (
            currentEmail
              ? {
                ...currentEmail,
                isRead: true,
              }
              : currentEmail
          ));
        }
      }
    } catch (error) {
      setEmail(null);
      setLoadError(
        getErrorMessage(
          error,
          'No fue posible cargar el correo.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [
    getMessageById,
    messageId,
    updateMessageState,
  ]);

  useEffect(() => {
    void loadEmail();
  }, [loadEmail]);

  const emailDate = useMemo(() => (
    formatDetailDate(
      email?.receivedAt
      || email?.sentAt
      || null,
    )
  ), [
    email?.receivedAt,
    email?.sentAt,
  ]);

  const bodyText = useMemo(() => (
    email
      ? getMailBody(email)
      : ''
  ), [email]);

  const handleToggleStar = useCallback(() => {
    if (!email || actionLoading) {
      return;
    }

    void (async () => {
      setActionLoading(true);

      try {
        const updatedMessage = await updateMessageState(
          email.id,
          {
            is_starred: !email.isStarred,
          },
        );

        setEmail((currentEmail) => (
          currentEmail
            ? {
              ...currentEmail,
              isStarred: updatedMessage.is_starred,
            }
            : currentEmail
        ));
      } catch (error) {
        Alert.alert(
          'No fue posible actualizar',
          getErrorMessage(error),
        );
      } finally {
        setActionLoading(false);
      }
    })();
  }, [
    actionLoading,
    email,
    updateMessageState,
  ]);

  const handleArchive = useCallback(() => {
    if (!email || actionLoading) {
      return;
    }

    void (async () => {
      setActionLoading(true);

      try {
        await archiveMessage(email.id);
        router.back();
      } catch (error) {
        Alert.alert(
          'No fue posible archivar',
          getErrorMessage(error),
        );
      } finally {
        setActionLoading(false);
      }
    })();
  }, [
    actionLoading,
    archiveMessage,
    email,
    router,
  ]);

  const handleTrash = useCallback(() => {
    if (!email || actionLoading) {
      return;
    }

    Alert.alert(
      'Mover a la papelera',
      (
        'El correo se moverá a la papelera de tu cuenta '
        + 'conectada.'
      ),
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Mover',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setActionLoading(true);

              try {
                await trashMessage(email.id);
                router.back();
              } catch (error) {
                Alert.alert(
                  'No fue posible mover el correo',
                  getErrorMessage(error),
                );
              } finally {
                setActionLoading(false);
              }
            })();
          },
        },
      ],
    );
  }, [
    actionLoading,
    email,
    router,
    trashMessage,
  ]);

  const handleRestore = useCallback(() => {
    if (!email || actionLoading) {
      return;
    }

    void (async () => {
      setActionLoading(true);

      try {
        await restoreMessage(email.id);
        router.back();
      } catch (error) {
        Alert.alert(
          'No fue posible restaurar',
          getErrorMessage(error),
        );
      } finally {
        setActionLoading(false);
      }
    })();
  }, [
    actionLoading,
    email,
    restoreMessage,
    router,
  ]);

  const handleDownload = useCallback((
    fileName: string,
  ) => {
    Alert.alert(
      'Descarga no disponible',
      (
        `${fileName} está sincronizado como adjunto, pero `
        + 'la descarga de contenido se habilitará en el '
        + 'siguiente bloque de integración de adjuntos.'
      ),
    );
  }, []);

  const handleReply = useCallback((
    replyType: 'reply' | 'reply_all' | 'forward',
  ) => {
    if (!email) {
      return;
    }

    const replyRecipient = replyType === 'reply_all'
      ? getReplyAllRecipients(email)
      : getReplyRecipient(email);

    if (
      replyType !== 'forward'
      && !replyRecipient
    ) {
      Alert.alert(
        'No fue posible responder',
        'Este correo no tiene una dirección de remitente válida.',
      );
      return;
    }

    const subjectPrefix = replyType === 'forward'
      ? 'Fwd: '
      : 'Re: ';

    router.push({
      pathname: '/(main)/mail/compose',
      params: {
        to: (
          replyType === 'forward'
            ? undefined
            : replyRecipient
        ),
        subject: `${subjectPrefix}${email.subject}`,
      },
    });
  }, [
    email,
    router,
  ]);

  if (loading) {
    return (
      <ScreenSafeArea style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={colors.brand.primary}
          />

          <Text style={styles.loadingText}>
            Cargando correo...
          </Text>
        </View>
      </ScreenSafeArea>
    );
  }

  if (!email || loadError) {
    return (
      <ScreenSafeArea style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconBox}>
            <Mail
              size={34}
              color={colors.neutral.gray500}
            />
          </View>

          <Text style={styles.errorTitle}>
            No fue posible abrir el correo
          </Text>

          <Text style={styles.errorText}>
            {loadError || 'El correo no está disponible.'}
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              void loadEmail();
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Reintentar abrir correo"
          >
            <Text style={styles.retryButtonText}>
              Reintentar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backTextButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Volver a correos"
          >
            <Text style={styles.backTextButtonText}>
              Volver a correos
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenSafeArea>
    );
  }

  const isInTrash = email.isTrashed;

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            disabled={actionLoading}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Volver a correos"
          >
            <ChevronLeft
              size={24}
              color={colors.neutral.text}
            />
          </TouchableOpacity>

          <View style={styles.headerRightCol}>
            <TouchableOpacity
              onPress={handleToggleStar}
              style={styles.toolbarBtn}
              disabled={actionLoading}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={
                email.isStarred
                  ? 'Quitar de importantes'
                  : 'Marcar como importante'
              }
            >
              <Star
                size={20}
                color={
                  email.isStarred
                    ? '#F59E0B'
                    : colors.neutral.text
                }
                fill={
                  email.isStarred
                    ? '#F59E0B'
                    : 'transparent'
                }
              />
            </TouchableOpacity>

            {isInTrash ? (
              <TouchableOpacity
                onPress={handleRestore}
                style={styles.restoreBtn}
                disabled={actionLoading}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Restaurar correo a la bandeja"
              >
                <Mail
                  size={19}
                  color={colors.brand.primary}
                />
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  onPress={handleArchive}
                  style={styles.toolbarBtn}
                  disabled={actionLoading}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Archivar correo"
                >
                  <Archive
                    size={20}
                    color={colors.neutral.text}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleTrash}
                  style={styles.toolbarBtn}
                  disabled={actionLoading}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Mover correo a la papelera"
                >
                  <Trash2
                    size={20}
                    color={colors.semantic.error}
                  />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {actionLoading ? (
            <View style={styles.actionLoadingRow}>
              <ActivityIndicator
                size="small"
                color={colors.brand.primary}
              />

              <Text style={styles.actionLoadingText}>
                Actualizando correo...
              </Text>
            </View>
          ) : null}

          <View style={styles.accountHeaderBox}>
            <Mail
              size={12}
              color={colors.neutral.gray600}
              style={styles.accountHeaderIcon}
            />

            <Text style={styles.accountHeaderText}>
              Cuenta: {email.accountEmail}
            </Text>
          </View>

          <Text style={styles.subjectText}>
            {email.subject}
          </Text>

          <View style={styles.senderRow}>
            <View
              style={[
                styles.avatarCircle,
                {
                  backgroundColor: email.initialsColor,
                },
              ]}
            >
              <Text style={styles.avatarText}>
                {getInitials(email.senderName)}
              </Text>
            </View>

            <View style={styles.senderDetails}>
              <View style={styles.senderNameRow}>
                <Text
                  style={styles.senderName}
                  numberOfLines={1}
                >
                  {email.senderName}
                </Text>
              </View>

              {email.senderEmail ? (
                <Text
                  style={styles.senderEmail}
                  numberOfLines={1}
                >
                  De: {email.senderEmail}
                </Text>
              ) : null}

              <Text
                style={styles.receiverEmail}
                numberOfLines={1}
              >
                {getRecipientLabel(email)}
              </Text>
            </View>

            <Text
              style={styles.dateText}
              numberOfLines={2}
            >
              {emailDate}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.emailBodyContainer}>
            <Text selectable style={styles.emailBodyText}>
              {bodyText}
            </Text>
          </View>

          {email.hasAttachment
            && email.attachments
            && email.attachments.length > 0 ? (
            <>
              <View style={styles.divider} />

              <View style={styles.attachmentsBox}>
                <Text style={styles.attachmentsTitle}>
                  Archivos adjuntos (
                  {email.attachments.length}
                  )
                </Text>

                <View style={styles.attachmentsListCol}>
                  {email.attachments.map((file) => (
                    <View
                      key={file.id}
                      style={styles.fileCard}
                    >
                      <View style={styles.fileIconBox}>
                        <FileText
                          size={18}
                          color={colors.neutral.gray600}
                        />
                      </View>

                      <View style={styles.fileDetails}>
                        <Text
                          style={styles.fileNameText}
                          numberOfLines={1}
                        >
                          {file.filename}
                        </Text>

                        <Text style={styles.fileSizeText}>
                          {getAttachmentDescription(
                            file.mime_type,
                            file.size_bytes,
                          )}
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => {
                          handleDownload(file.filename);
                        }}
                        style={styles.downloadBtn}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={
                          `Descargar ${file.filename}`
                        }
                      >
                        <Download
                          size={16}
                          color={colors.brand.primary}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            </>
          ) : null}

          {!isInTrash ? (
            <View style={styles.replyActionsRow}>
              <TouchableOpacity
                style={styles.replyBtn}
                onPress={() => {
                  handleReply('reply');
                }}
                disabled={actionLoading}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Responder correo"
              >
                <CornerUpLeft
                  size={16}
                  color={colors.neutral.text}
                  style={styles.replyIcon}
                />

                <Text style={styles.replyBtnText}>
                  Responder
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.replyBtn}
                onPress={() => {
                  handleReply('reply_all');
                }}
                disabled={actionLoading}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Responder a todos"
              >
                <ReplyAll
                  size={16}
                  color={colors.neutral.text}
                  style={styles.replyIcon}
                />

                <Text style={styles.replyBtnText}>
                  Todos
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.replyBtn}
                onPress={() => {
                  handleReply('forward');
                }}
                disabled={actionLoading}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Reenviar correo"
              >
                <CornerUpRight
                  size={16}
                  color={colors.neutral.text}
                  style={styles.replyIcon}
                />

                <Text style={styles.replyBtnText}>
                  Reenviar
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.listBottomSpacing} />
        </ScrollView>

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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  errorIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.gray100,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    marginBottom: 18,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.neutral.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.neutral.gray600,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    borderRadius: 12,
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.neutral.white,
  },
  backTextButton: {
    marginTop: 16,
    padding: 8,
  },
  backTextButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brand.primary,
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
  headerRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  toolbarBtn: {
    padding: 4,
  },
  restoreBtn: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  actionLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    marginBottom: 14,
    borderRadius: 10,
    backgroundColor: `${colors.brand.primary}0D`,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  actionLoadingText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  accountHeaderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.gray200,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  accountHeaderIcon: {
    marginRight: 6,
  },
  accountHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.gray700,
  },
  subjectText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.neutral.text,
    lineHeight: 24,
    marginBottom: 16,
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: colors.neutral.white,
    fontSize: 13,
    fontWeight: '800',
  },
  senderDetails: {
    flex: 1,
    minWidth: 0,
  },
  senderNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  senderName: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  senderEmail: {
    fontSize: 11,
    color: colors.neutral.gray600,
  },
  receiverEmail: {
    fontSize: 11,
    color: colors.neutral.gray500,
    marginTop: 1,
  },
  dateText: {
    width: 92,
    marginLeft: 8,
    fontSize: 10,
    lineHeight: 14,
    color: colors.neutral.gray600,
    textAlign: 'right',
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral.gray200,
    marginVertical: 16,
  },
  emailBodyContainer: {
    minHeight: 90,
  },
  emailBodyText: {
    fontSize: 14,
    color: colors.neutral.text,
    lineHeight: 22,
    fontWeight: '500',
  },
  attachmentsBox: {
    marginBottom: 24,
  },
  attachmentsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.gray700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  attachmentsListCol: {
    gap: 10,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 12,
  },
  fileIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.neutral.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fileDetails: {
    flex: 1,
    minWidth: 0,
  },
  fileNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.text,
    marginBottom: 2,
  },
  fileSizeText: {
    fontSize: 11,
    color: colors.neutral.gray600,
  },
  downloadBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  replyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
    borderRadius: 12,
    paddingVertical: 12,
  },
  replyIcon: {
    marginRight: 6,
  },
  replyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  listBottomSpacing: {
    height: 100,
  },
});