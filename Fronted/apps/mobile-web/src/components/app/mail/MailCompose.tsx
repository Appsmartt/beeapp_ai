'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import {
  ChevronDown,
  FileText,
  Paperclip,
  Send,
  X,
} from 'lucide-react';
import {
  createMailDraft,
  sendMailDraft,
  uploadCurrentWebStorageFiles,
} from '@beeapp/api-client';
import type {
  MailDraftRecipientPayload,
  MailIntegration,
  StorageFile,
} from '@beeapp/shared-types';

import {
  getMailIntegrationLabel,
} from './mailTypes';

const MAX_MAIL_ATTACHMENTS = 10;

const MAX_MAIL_ATTACHMENT_SIZE_BYTES =
  3 * 1024 * 1024;

const MAX_MAIL_ATTACHMENTS_TOTAL_SIZE_BYTES =
  10 * 1024 * 1024;

type RecipientField = 'to' | 'cc' | 'bcc';

interface MailAttachment {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

export interface ComposeDraft {
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
}

interface MailComposeProps {
  isOpen: boolean;
  integrations: MailIntegration[];
  draft?: ComposeDraft | null;
  onClose: () => void;
  onSent: () => Promise<void> | void;
  onOpenIntegrations: () => void;
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

function getInitialRecipients(
  value: string,
): MailDraftRecipientPayload[] {
  return parseRecipientInput(value).validRecipients;
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

function getTotalAttachmentSize(
  attachments: MailAttachment[],
): number {
  return attachments.reduce(
    (total, attachment) => total + attachment.sizeBytes,
    0,
  );
}

export default function MailCompose({
  isOpen,
  integrations,
  draft,
  onClose,
  onSent,
  onOpenIntegrations,
}: MailComposeProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeIntegrations = useMemo(
    () => integrations.filter((integration) => (
      integration.status === 'active'
      && integration.can_sync
    )),
    [integrations],
  );

  const [
    selectedIntegrationId,
    setSelectedIntegrationId,
  ] = useState<string | null>(null);

  const [
    senderMenuOpen,
    setSenderMenuOpen,
  ] = useState(false);

  const [showCcBcc, setShowCcBcc] = useState(false);

  const [toRecipients, setToRecipients] = useState<
    MailDraftRecipientPayload[]
  >([]);

  const [ccRecipients, setCcRecipients] = useState<
    MailDraftRecipientPayload[]
  >([]);

  const [bccRecipients, setBccRecipients] = useState<
    MailDraftRecipientPayload[]
  >([]);

  const [recipientInput, setRecipientInput] = useState<
    Record<RecipientField, string>
  >({
    to: '',
    cc: '',
    bcc: '',
  });

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const [attachments, setAttachments] = useState<
    MailAttachment[]
  >([]);

  const [sending, setSending] = useState(false);

  const [
    uploadingAttachments,
    setUploadingAttachments,
  ] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const selectedIntegration = activeIntegrations.find(
    (integration) => integration.id === selectedIntegrationId,
  ) || null;

  const attachmentTotalSize = useMemo(
    () => getTotalAttachmentSize(attachments),
    [attachments],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSelectedIntegrationId(
      activeIntegrations[0]?.id || null,
    );

    setSenderMenuOpen(false);

    setShowCcBcc(Boolean(
      draft?.cc
      || draft?.bcc,
    ));

    setToRecipients(
      getInitialRecipients(draft?.to || ''),
    );

    setCcRecipients(
      getInitialRecipients(draft?.cc || ''),
    );

    setBccRecipients(
      getInitialRecipients(draft?.bcc || ''),
    );

    setRecipientInput({
      to: '',
      cc: '',
      bcc: '',
    });

    setSubject(draft?.subject || '');
    setBody('');
    setAttachments([]);
    setError(null);
  }, [
    activeIntegrations,
    draft,
    isOpen,
  ]);

  if (!isOpen) {
    return null;
  }

  const getRecipientsForField = (
    field: RecipientField,
  ): MailDraftRecipientPayload[] => {
    if (field === 'to') {
      return toRecipients;
    }

    if (field === 'cc') {
      return ccRecipients;
    }

    return bccRecipients;
  };

  const setRecipientsForField = (
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
  };

  const getAllRecipientEmails = (
    excludedField?: RecipientField,
  ): Set<string> => {
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
  };

  const addRecipients = (
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
      setError(
        `Revisa esta dirección: "${invalidValues[0]}".`,
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
      setError(
        (
          `"${duplicatedElsewhere.email}" ya está `
          + 'en otro campo de destinatarios.'
        ),
      );

      return false;
    }

    setRecipientsForField(
      field,
      [
        ...currentRecipients,
        ...validRecipients.filter((recipient) => (
          !currentEmails.has(
            getRecipientKey(recipient.email),
          )
        )),
      ],
    );

    setRecipientInput((current) => ({
      ...current,
      [field]: '',
    }));

    setError(null);

    return true;
  };

  const removeRecipient = (
    field: RecipientField,
    email: string,
  ) => {
    const keyToRemove = getRecipientKey(email);

    setRecipientsForField(
      field,
      getRecipientsForField(field).filter(
        (recipient) => (
          getRecipientKey(recipient.email)
          !== keyToRemove
        ),
      ),
    );
  };

  const handleRecipientChange = (
    field: RecipientField,
    value: string,
  ) => {
    if (!/[,;\n]$/.test(value)) {
      setRecipientInput((current) => ({
        ...current,
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
      setRecipientInput((current) => ({
        ...current,
        [field]: valueWithoutSeparator,
      }));
    }
  };

  const commitPendingRecipients = (): boolean => {
    const fields: RecipientField[] = [
      'to',
      'cc',
      'bcc',
    ];

    for (const field of fields) {
      if (!recipientInput[field].trim()) {
        continue;
      }

      if (!addRecipients(field)) {
        return false;
      }
    }

    return true;
  };

  const handleAttachmentChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFiles = Array.from(
      event.target.files || [],
    );

    event.target.value = '';

    if (
      !selectedFiles.length
      || sending
      || uploadingAttachments
    ) {
      return;
    }

    const remainingSlots = (
      MAX_MAIL_ATTACHMENTS - attachments.length
    );

    if (remainingSlots <= 0) {
      setError(
        (
          `Puedes adjuntar máximo ${MAX_MAIL_ATTACHMENTS} `
          + 'archivos por correo.'
        ),
      );

      return;
    }

    const filesToUpload = selectedFiles.slice(
      0,
      remainingSlots,
    );

    const tooLargeFile = filesToUpload.find(
      (file) => (
        file.size > MAX_MAIL_ATTACHMENT_SIZE_BYTES
      ),
    );

    if (tooLargeFile) {
      setError(
        (
          `“${tooLargeFile.name}” supera el límite `
          + 'de 3 MB por adjunto.'
        ),
      );

      return;
    }

    const selectedSize = filesToUpload.reduce(
      (total, file) => total + file.size,
      0,
    );

    if (
      attachmentTotalSize + selectedSize
      > MAX_MAIL_ATTACHMENTS_TOTAL_SIZE_BYTES
    ) {
      setError(
        (
          'Los adjuntos de un correo no pueden superar '
          + '10 MB en total.'
        ),
      );

      return;
    }

    void (async () => {
      try {
        setUploadingAttachments(true);
        setError(null);

        const formData = new FormData();

        filesToUpload.forEach((file) => {
          formData.append('files', file);
        });

        const uploadResponse = (
          await uploadCurrentWebStorageFiles(formData)
        );

        if (uploadResponse.failure_count > 0) {
          const firstFailure = (
            uploadResponse.failed_files[0]
          );

          setError(
            firstFailure?.detail
            || (
              `${uploadResponse.failure_count} archivo(s) `
              + 'no pudieron subirse.'
            ),
          );
        }

        const uploadedFiles = (
          uploadResponse.files as StorageFile[]
        );

        setAttachments((currentAttachments) => {
          const existingIds = new Set(
            currentAttachments.map((attachment) => (
              attachment.id
            )),
          );

          return [
            ...currentAttachments,
            ...uploadedFiles
              .filter((file) => !existingIds.has(file.id))
              .map((file) => ({
                id: file.id,
                name: (
                  file.display_name
                  || file.original_name
                  || 'Archivo adjunto'
                ),
                mimeType: (
                  file.mime_type
                  || 'application/octet-stream'
                ),
                sizeBytes: file.size_bytes || 0,
              })),
          ].slice(0, MAX_MAIL_ATTACHMENTS);
        });
      } catch (uploadError) {
        setError(
          (
            'No fue posible adjuntar: '
            + getErrorMessage(uploadError)
          ),
        );
      } finally {
        setUploadingAttachments(false);
      }
    })();
  };

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (sending || uploadingAttachments) {
      return;
    }

    if (!selectedIntegrationId) {
      setError(
        (
          'Selecciona una cuenta activa de Google '
          + 'o Microsoft para enviar.'
        ),
      );

      return;
    }

    if (!commitPendingRecipients()) {
      return;
    }

    if (toRecipients.length === 0) {
      setError(
        (
          'Especifica al menos un destinatario '
          + 'en el campo Para.'
        ),
      );

      return;
    }

    void (async () => {
      try {
        setSending(true);
        setError(null);

        const draftResponse = await createMailDraft({
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
        });

        await sendMailDraft(
          draftResponse.message.id,
        );

        await onSent();
        onClose();
      } catch (sendError) {
        setError(
          (
            'No fue posible enviar: '
            + getErrorMessage(sendError)
          ),
        );
      } finally {
        setSending(false);
      }
    })();
  };

  const renderRecipientField = (
    field: RecipientField,
    label: string,
    placeholder: string,
    canToggleCcBcc = false,
  ) => {
    const recipients = getRecipientsForField(field);

    return (
      <div className="flex items-start gap-3 border-b border-neutral-100 px-5 py-3">
        <span className="w-14 shrink-0 pt-1.5 text-xs font-normal text-neutral-500">
          {label}
        </span>

        <div className="min-w-0 flex-1">
          {recipients.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {recipients.map((recipient) => (
                <span
                  key={`${field}:${recipient.email}`}
                  className="inline-flex max-w-full items-center gap-1 rounded-full border border-brand-primary/20 bg-brand-primary/10 px-2.5 py-1 text-[11px] font-medium text-brand-primary"
                >
                  <span className="max-w-[300px] truncate">
                    {recipient.display_name
                      ? (
                        `${recipient.display_name} `
                        + `<${recipient.email}>`
                      )
                      : recipient.email}
                  </span>

                  <button
                    type="button"
                    disabled={sending}
                    onClick={() => {
                      removeRecipient(
                        field,
                        recipient.email,
                      );
                    }}
                    aria-label={`Quitar ${recipient.email}`}
                    className="rounded-full p-0.5 transition-colors hover:bg-brand-primary/15 disabled:opacity-50"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          <input
            type="text"
            value={recipientInput[field]}
            disabled={sending}
            placeholder={placeholder}
            onChange={(inputEvent) => {
              handleRecipientChange(
                field,
                inputEvent.target.value,
              );
            }}
            onBlur={() => {
              if (recipientInput[field].trim()) {
                addRecipients(field);
              }
            }}
            onKeyDown={(keyboardEvent) => {
              if (keyboardEvent.key === 'Enter') {
                keyboardEvent.preventDefault();
                addRecipients(field);
              }
            }}
            className="w-full bg-transparent py-1.5 text-xs text-neutral-900 outline-none placeholder:text-neutral-400 disabled:opacity-50"
          />
        </div>

        {canToggleCcBcc ? (
          <button
            type="button"
            disabled={sending}
            onClick={() => {
              setShowCcBcc((current) => !current);
            }}
            className="shrink-0 rounded-md bg-neutral-100 px-2 py-1 text-[10px] font-medium text-neutral-500 transition-colors hover:bg-neutral-200 disabled:opacity-50"
          >
            {showCcBcc
              ? 'Ocultar'
              : 'CC/CCO'}
          </button>
        ) : null}
      </div>
    );
  };

  const senderLabel = selectedIntegration
    ? getMailIntegrationLabel(selectedIntegration)
    : 'Selecciona una cuenta';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar redacción"
        onClick={onClose}
        disabled={sending || uploadingAttachments}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">
              Mensaje nuevo
            </h2>

            <p className="mt-0.5 text-[11px] text-neutral-500">
              Envía desde una cuenta externa conectada.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={sending || uploadingAttachments}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {activeIntegrations.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center px-8 text-center">
            <h3 className="text-base font-semibold text-neutral-900">
              Conecta una cuenta para enviar
            </h3>

            <p className="mt-2 max-w-md text-sm leading-relaxed text-neutral-500">
              Necesitas una cuenta de Google o Microsoft activa
              con permiso de correo para redactar y enviar.
            </p>

            <button
              type="button"
              onClick={onOpenIntegrations}
              className="mt-5 rounded-full bg-brand-primary px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Ir a integraciones
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 overflow-y-auto">
              {error ? (
                <div className="mx-5 mt-4 flex items-start justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5">
                  <p className="text-xs leading-relaxed text-red-700">
                    {error}
                  </p>

                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="text-sm font-semibold text-red-600"
                    aria-label="Cerrar error"
                  >
                    ×
                  </button>
                </div>
              ) : null}

              <div className="relative flex items-center gap-3 border-b border-neutral-100 px-5 py-3">
                <span className="w-14 shrink-0 text-xs font-normal text-neutral-500">
                  De:
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setSenderMenuOpen((current) => !current);
                  }}
                  disabled={sending}
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-xs font-medium text-neutral-900 transition-colors hover:text-brand-primary disabled:opacity-50"
                >
                  <span className="truncate">
                    {senderLabel}
                  </span>

                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                </button>

                {senderMenuOpen ? (
                  <div className="absolute left-20 top-full z-30 mt-1 w-72 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-xl">
                    {activeIntegrations.map((integration) => {
                      const isSelected = (
                        integration.id
                        === selectedIntegrationId
                      );

                      return (
                        <button
                          key={integration.id}
                          type="button"
                          onClick={() => {
                            setSelectedIntegrationId(
                              integration.id,
                            );

                            setSenderMenuOpen(false);
                          }}
                          className={`w-full truncate px-3 py-2 text-left text-xs transition-colors hover:bg-neutral-50 ${
                            isSelected
                              ? 'font-semibold text-brand-primary'
                              : 'font-normal text-neutral-700'
                          }`}
                        >
                          {getMailIntegrationLabel(integration)}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              {renderRecipientField(
                'to',
                'Para:',
                'destinatario@correo.com',
                true,
              )}

              {showCcBcc ? (
                <>
                  {renderRecipientField(
                    'cc',
                    'CC:',
                    'copia@correo.com',
                  )}

                  {renderRecipientField(
                    'bcc',
                    'CCO:',
                    'copiaoculta@correo.com',
                  )}
                </>
              ) : null}

              <div className="flex items-center gap-3 border-b border-neutral-100 px-5 py-3">
                <span className="w-14 shrink-0 text-xs font-normal text-neutral-500">
                  Asunto:
                </span>

                <input
                  type="text"
                  value={subject}
                  disabled={sending}
                  placeholder="Asunto del correo"
                  onChange={(event) => {
                    setSubject(event.target.value);
                  }}
                  className="min-w-0 flex-1 bg-transparent text-xs text-neutral-900 outline-none placeholder:text-neutral-400 disabled:opacity-50"
                />
              </div>

              <textarea
                value={body}
                disabled={sending}
                placeholder="Escribe tu mensaje aquí..."
                onChange={(event) => {
                  setBody(event.target.value);
                }}
                className="min-h-[260px] w-full resize-none px-5 py-4 text-sm leading-relaxed text-neutral-800 outline-none placeholder:text-neutral-400 disabled:opacity-50"
              />

              {attachments.length > 0 ? (
                <div className="space-y-2 px-5 pb-3">
                  <p className="text-[11px] font-semibold text-neutral-600">
                    Adjuntos ({attachments.length}) ·{' '}
                    {formatBytes(attachmentTotalSize)}
                  </p>

                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-neutral-500" />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-neutral-900">
                          {attachment.name}
                        </p>

                        <p className="text-[10px] text-neutral-500">
                          {attachment.mimeType} ·{' '}
                          {formatBytes(
                            attachment.sizeBytes,
                          )}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={sending}
                        onClick={() => {
                          setAttachments((current) => (
                            current.filter((item) => (
                              item.id !== attachment.id
                            ))
                          ));
                        }}
                        aria-label={`Quitar ${attachment.name}`}
                        className="rounded-lg p-1 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-neutral-100 px-5 py-3">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleAttachmentChange}
                />

                <button
                  type="button"
                  disabled={
                    sending
                    || uploadingAttachments
                  }
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                  className="flex items-center gap-2 rounded-xl bg-brand-primary/10 px-3 py-2 text-xs font-medium text-brand-primary transition-colors hover:bg-brand-primary/20 disabled:opacity-50"
                >
                  {uploadingAttachments ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}

                  {uploadingAttachments
                    ? 'Subiendo...'
                    : 'Adjuntar'}
                </button>

                <p className="mt-1 text-[10px] text-neutral-400">
                  Máximo 10 archivos · 3 MB por archivo · 10 MB total
                </p>
              </div>

              <button
                type="submit"
                disabled={
                  sending
                  || uploadingAttachments
                }
                className="flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-brand-dark disabled:bg-neutral-300"
              >
                {sending ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Enviando...
                  </>
                ) : (
                  <>
                    Enviar
                    <Send className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}