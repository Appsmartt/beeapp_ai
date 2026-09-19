import {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Image as ReactNativeImage,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Audio,
} from 'expo-av';
import {
  Camera,
  File,
  Image as ImageIcon,
  MapPin,
  Mic,
  Paperclip,
  Send,
  User,
  X,
} from 'lucide-react-native';
import {
  colors,
} from '@beeapp/design-system';

type PendingChatAttachment = {
  kind: 'image' | 'document';
  name: string;
  localUri: string;
};

export interface RecordedVoiceNote {
  uri: string;
  name: string;
  mimeType: string;
  durationSeconds: number;
}

interface WriteBarProps {
  onSendMessage: (
    text: string,
    attachment?: PendingChatAttachment | null,
  ) => void;
  onSendVoiceNote: (
    voiceNote: RecordedVoiceNote,
  ) => void;
  onSendAttachment: (
    type: 'photo' | 'camera' | 'file' | 'location' | 'contact',
  ) => void;
  pendingAttachment?: PendingChatAttachment | null;
  onRemovePendingAttachment?: () => void;
  value?: string;
  onChangeText?: (text: string) => void;
  disabled?: boolean;
  uploadingAttachment?: boolean;
}

function formatRecordingTime(
  durationSeconds: number,
): string {
  const safeDuration = Math.max(
    0,
    Math.floor(durationSeconds),
  );

  return (
    `${Math.floor(safeDuration / 60)}:`
    + String(safeDuration % 60).padStart(2, '0')
  );
}

function extensionFromUri(
  uri: string,
): string {
  const match = uri.match(/\.([a-z0-9]+)(?:\?.*)?$/i);

  return match?.[1]?.toLowerCase() || 'm4a';
}

function mimeTypeFromExtension(
  extension: string,
): string {
  if (extension === 'aac') {
    return 'audio/aac';
  }

  if (extension === 'wav') {
    return 'audio/wav';
  }

  if (extension === 'mp3') {
    return 'audio/mpeg';
  }

  if (extension === '3gp') {
    return 'audio/3gpp';
  }

  return 'audio/m4a';
}

export default function WriteBar({
  onSendMessage,
  onSendVoiceNote,
  onSendAttachment,
  pendingAttachment = null,
  onRemovePendingAttachment,
  value,
  onChangeText,
  disabled = false,
  uploadingAttachment = false,
}: WriteBarProps) {
  const [internalText, setInternalText] = useState('');
  const text = value !== undefined ? value : internalText;
  const setText = onChangeText || setInternalText;

  const [attachOpen, setAttachOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordInterval = useRef<
    ReturnType<typeof setInterval> | null
  >(null);

  useEffect(() => {
    if (!isRecording) {
      if (recordInterval.current) {
        clearInterval(recordInterval.current);
        recordInterval.current = null;
      }

      return;
    }

    recordInterval.current = setInterval(() => {
      const status = recordingRef.current?.getStatusAsync();

      void Promise.resolve(status)
        .then((nextStatus) => {
          if (
            nextStatus?.isRecording
            && typeof nextStatus.durationMillis === 'number'
          ) {
            setRecordTime(
              Math.max(
                0,
                Math.floor(nextStatus.durationMillis / 1000),
              ),
            );
          }
        })
        .catch(() => {
          // La UI conserva el último tiempo válido si falla una lectura.
        });
    }, 250);

    return () => {
      if (recordInterval.current) {
        clearInterval(recordInterval.current);
        recordInterval.current = null;
      }
    };
  }, [isRecording]);

  useEffect(() => {
    return () => {
      const activeRecording = recordingRef.current;

      recordingRef.current = null;

      if (activeRecording) {
        void activeRecording.stopAndUnloadAsync()
          .catch(() => {
            // Limpieza de mejor esfuerzo al desmontar.
          });
      }
    };
  }, []);

  const canSend = Boolean(
    text.trim()
    || pendingAttachment,
  );

  const handleSend = () => {
    if (!canSend || disabled || uploadingAttachment) {
      return;
    }

    onSendMessage(text, pendingAttachment);
    setText('');
  };

  const handleStartRecord = async () => {
    if (
      disabled
      || uploadingAttachment
      || isRecording
      || recordingRef.current
    ) {
      return;
    }

    try {
      const permission = await Audio.requestPermissionsAsync();

      if (!permission.granted) {
        throw new Error(
          'Debes permitir el micrófono para grabar una nota de voz.',
        );
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const recording = new Audio.Recording();

      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      await recording.startAsync();

      recordingRef.current = recording;
      setRecordTime(0);
      setAttachOpen(false);
      setIsRecording(true);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'No fue posible iniciar la grabación.';

      setIsRecording(false);
      recordingRef.current = null;

      throw new Error(message);
    }
  };

  const stopAndUnloadRecording = async (): Promise<{
    uri: string;
    durationSeconds: number;
  } | null> => {
    const recording = recordingRef.current;

    recordingRef.current = null;

    if (!recording) {
      return null;
    }

    let durationSeconds = recordTime;

    try {
      const status = await recording.getStatusAsync();

      if (typeof status.durationMillis === 'number') {
        durationSeconds = Math.max(
          0,
          Math.floor(status.durationMillis / 1000),
        );
      }
    } catch {
      // Se usa el último valor de UI si no se pudo consultar el estado.
    }

    try {
      await recording.stopAndUnloadAsync();
    } finally {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      }).catch(() => {
        // Restaurar modo es de mejor esfuerzo.
      });
    }

    const uri = recording.getURI();

    if (!uri) {
      return null;
    }

    return {
      uri,
      durationSeconds,
    };
  };

  const handleCancelRecord = () => {
    setIsRecording(false);
    setRecordTime(0);

    void stopAndUnloadRecording()
      .catch(() => {
        // Cancelar nunca debe dejar la barra bloqueada.
      });
  };

  const handleStopRecord = () => {
    if (!isRecording || disabled || uploadingAttachment) {
      return;
    }

    setIsRecording(false);

    void stopAndUnloadRecording()
      .then((result) => {
        if (!result) {
          throw new Error(
            'No fue posible obtener el archivo de la nota de voz.',
          );
        }

        if (result.durationSeconds < 1) {
          throw new Error(
            'La nota de voz debe durar al menos un segundo.',
          );
        }

        const extension = extensionFromUri(result.uri);

        onSendVoiceNote({
          uri: result.uri,
          name: `nota-de-voz-${Date.now()}.${extension}`,
          mimeType: mimeTypeFromExtension(extension),
          durationSeconds: result.durationSeconds,
        });
      })
      .catch((error) => {
        const message = error instanceof Error
          ? error.message
          : 'No fue posible preparar la nota de voz.';

        console.warn('[chat voice note]', message);
      })
      .finally(() => {
        setRecordTime(0);
      });
  };

  const handleAttachItemClick = (
    type: 'photo' | 'camera' | 'file' | 'location' | 'contact',
  ) => {
    if (disabled || uploadingAttachment) {
      return;
    }

    onSendAttachment(type);
    setAttachOpen(false);
  };

  return (
    <View style={styles.outerContainer}>
      {pendingAttachment ? (
        <View style={styles.previewRow}>
          {pendingAttachment.kind === 'image' ? (
            <ReactNativeImage
              source={{
                uri: pendingAttachment.localUri,
              }}
              style={styles.previewImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.previewFileIcon}>
              <File
                size={20}
                color={colors.brand.primary}
              />
            </View>
          )}

          <View style={styles.previewTextWrap}>
            <Text
              style={styles.previewName}
              numberOfLines={1}
            >
              {pendingAttachment.name}
            </Text>

            <Text style={styles.previewDescription}>
              {pendingAttachment.kind === 'image'
                ? 'Imagen lista para enviar'
                : 'Archivo listo para enviar'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.removePreviewButton}
            onPress={onRemovePendingAttachment}
            disabled={disabled || uploadingAttachment}
            activeOpacity={0.7}
            accessibilityLabel="Quitar archivo adjunto"
          >
            <X
              size={18}
              color={colors.neutral.gray600}
            />
          </TouchableOpacity>
        </View>
      ) : null}

      {attachOpen ? (
        <View style={styles.attachPanel}>
          <TouchableOpacity
            style={styles.attachPanelItem}
            onPress={() => handleAttachItemClick('photo')}
            disabled={disabled || uploadingAttachment}
          >
            <View style={styles.attachIconWrap}>
              <ImageIcon
                size={18}
                color={colors.neutral.gray600}
              />
            </View>

            <Text style={styles.attachText}>Fotos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.attachPanelItem}
            onPress={() => handleAttachItemClick('camera')}
            disabled={disabled || uploadingAttachment}
          >
            <View style={styles.attachIconWrap}>
              <Camera
                size={18}
                color={colors.neutral.gray600}
              />
            </View>

            <Text style={styles.attachText}>Cámara</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.attachPanelItem}
            onPress={() => handleAttachItemClick('file')}
            disabled={disabled || uploadingAttachment}
          >
            <View style={styles.attachIconWrap}>
              <File
                size={18}
                color={colors.neutral.gray600}
              />
            </View>

            <Text style={styles.attachText}>Archivo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.attachPanelItem}
            onPress={() => handleAttachItemClick('location')}
            disabled
          >
            <View style={styles.attachIconWrap}>
              <MapPin
                size={18}
                color={colors.neutral.gray400}
              />
            </View>

            <Text style={styles.attachTextDisabled}>
              Ubicación
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.attachPanelItem}
            onPress={() => handleAttachItemClick('contact')}
            disabled
          >
            <View style={styles.attachIconWrap}>
              <User
                size={18}
                color={colors.neutral.gray400}
              />
            </View>

            <Text style={styles.attachTextDisabled}>
              Contacto
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.barContainer}>
        {isRecording ? (
          <View style={styles.recordStateContainer}>
            <View style={styles.recordIndicatorWrap}>
              <View style={styles.redDot} />

              <Text style={styles.recordTimer}>
                {`Grabando... ${formatRecordingTime(recordTime)}`}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleCancelRecord}
              activeOpacity={0.7}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelBtnText}>
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleStopRecord}
              activeOpacity={0.7}
              style={styles.stopRecordBtn}
            >
              <Send
                size={16}
                color={colors.neutral.white}
              />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.inputContainerRow}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                attachOpen && styles.actionBtnActive,
              ]}
              onPress={() => {
                if (!disabled && !uploadingAttachment) {
                  setAttachOpen((currentValue) => (
                    !currentValue
                  ));
                }
              }}
              activeOpacity={0.7}
              disabled={disabled || uploadingAttachment}
              accessibilityLabel="Adjuntar archivo"
            >
              {attachOpen ? (
                <X
                  size={20}
                  color={colors.neutral.gray600}
                />
              ) : (
                <Paperclip
                  size={20}
                  color={colors.neutral.gray600}
                />
              )}
            </TouchableOpacity>

            <TextInput
              style={styles.textInput}
              placeholder={
                uploadingAttachment
                  ? 'Subiendo archivo...'
                  : 'Escribe un mensaje...'
              }
              placeholderTextColor={colors.neutral.gray500}
              value={text}
              onChangeText={setText}
              editable={!disabled && !uploadingAttachment}
              multiline
            />

            {canSend ? (
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (
                    disabled
                    || uploadingAttachment
                  ) && styles.buttonDisabled,
                ]}
                onPress={handleSend}
                activeOpacity={0.8}
                disabled={disabled || uploadingAttachment}
                accessibilityLabel="Enviar mensaje"
              >
                <Send
                  size={18}
                  color={colors.neutral.white}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.micButton}
                onPress={() => {
                  void handleStartRecord()
                    .catch((error) => {
                      console.warn(
                        '[chat voice note] start failed',
                        error,
                      );
                    });
                }}
                disabled={disabled || uploadingAttachment}
                activeOpacity={0.7}
                accessibilityLabel="Grabar nota de voz"
              >
                <Mic
                  size={20}
                  color={colors.neutral.gray600}
                />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: colors.neutral.white,
    borderColor: colors.neutral.gray200,
    borderTopWidth: 1,
    width: '100%',
  },
  previewRow: {
    alignItems: 'center',
    backgroundColor: colors.neutral.gray50,
    borderBottomColor: colors.neutral.gray200,
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 66,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  previewImage: {
    borderRadius: 8,
    height: 48,
    width: 48,
  },
  previewFileIcon: {
    alignItems: 'center',
    backgroundColor: '#F0EAFF',
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  previewTextWrap: {
    flex: 1,
    marginHorizontal: 10,
  },
  previewName: {
    color: colors.neutral.text,
    fontSize: 12,
    fontWeight: '700',
  },
  previewDescription: {
    color: colors.neutral.gray600,
    fontSize: 11,
    marginTop: 3,
  },
  removePreviewButton: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderColor: colors.neutral.gray200,
    borderRadius: 16,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  attachPanel: {
    backgroundColor: colors.neutral.gray50,
    borderBottomColor: colors.neutral.gray200,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
  },
  attachPanelItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachIconWrap: {
    alignItems: 'center',
    backgroundColor: colors.neutral.gray100,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginBottom: 6,
    width: 40,
  },
  attachText: {
    color: colors.neutral.gray700,
    fontSize: 11,
    fontWeight: '400',
  },
  attachTextDisabled: {
    color: colors.neutral.gray400,
    fontSize: 11,
    fontWeight: '400',
  },
  barContainer: {
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  inputContainerRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  actionBtn: {
    alignItems: 'center',
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    marginRight: 8,
    width: 38,
  },
  actionBtnActive: {
    backgroundColor: colors.neutral.gray100,
  },
  textInput: {
    backgroundColor: colors.neutral.gray50,
    borderColor: colors.neutral.gray200,
    borderRadius: 20,
    borderWidth: 1,
    color: colors.neutral.text,
    flex: 1,
    fontSize: 14,
    marginRight: 8,
    maxHeight: 100,
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  micButton: {
    alignItems: 'center',
    backgroundColor: colors.neutral.gray100,
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  recordStateContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 38,
    justifyContent: 'space-between',
    width: '100%',
  },
  recordIndicatorWrap: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  redDot: {
    backgroundColor: colors.semantic.error,
    borderRadius: 4,
    height: 8,
    marginRight: 8,
    width: 8,
  },
  recordTimer: {
    color: colors.neutral.text,
    fontSize: 13,
    fontWeight: '400',
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cancelBtnText: {
    color: colors.semantic.error,
    fontSize: 13,
    fontWeight: '400',
  },
  stopRecordBtn: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
});
