import {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import {
  Audio,
} from 'expo-av';
import {
  Check,
  CheckCheck,
  FileText,
  Play,
  Pause,
  Bot,
} from 'lucide-react-native';
import { colors } from '@beeapp/design-system';
import VerifiedBadge from '../VerifiedBadge';
import AiCatalogCards from './AiCatalogCards';
import {
  type AiSearchResult,
} from '../../mocks/aiSearchResults';

interface MessageBubbleProps {
  senderName?: string;
  senderVerified?: boolean;
  isUser: boolean;
  isAI?: boolean;
  sentByAi?: boolean;
  type: 'text' | 'image' | 'file' | 'audio';
  text?: string;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string;
  audioDuration?: string;
  status: 'sent' | 'delivered' | 'read';
  time: string;
  replyTo?: {
    sender: string;
    text: string;
  };
  showCatalog?: boolean;
  isEdited?: boolean;
  isDestroyed?: boolean;
  isPinned?: boolean;
  onLongPress?: () => void;
  onContactCatalogItem?: (
    item: AiSearchResult,
  ) => void;
}

function formatDuration(
  milliseconds: number | null | undefined,
): string {
  const seconds = Math.max(
    0,
    Math.floor((milliseconds || 0) / 1000),
  );

  return (
    `${Math.floor(seconds / 60)}:`
    + String(seconds % 60).padStart(2, '0')
  );
}

export default function MessageBubble({
  senderName,
  senderVerified,
  isUser,
  isAI,
  sentByAi,
  type,
  text,
  mediaUrl,
  fileName,
  fileSize,
  audioDuration,
  status,
  time,
  replyTo,
  showCatalog,
  isEdited,
  isDestroyed,
  onLongPress,
  onContactCatalogItem,
}: MessageBubbleProps) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackDuration, setPlaybackDuration] = useState<
    string | null
  >(null);
  const [audioError, setAudioError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    return () => {
      const sound = soundRef.current;

      soundRef.current = null;

      if (sound) {
        void sound.unloadAsync().catch(() => {
          // La limpieza no debe bloquear el desmontaje.
        });
      }
    };
  }, []);

  useEffect(() => {
    setIsPlaying(false);
    setPlaybackDuration(null);
    setAudioError(null);

    const sound = soundRef.current;
    soundRef.current = null;

    if (sound) {
      void sound.unloadAsync().catch(() => {
        // Se descarta el reproductor anterior al cambiar mensaje.
      });
    }
  }, [mediaUrl, type]);

  const handleToggleAudio = async () => {
    if (type !== 'audio') {
      return;
    }

    if (!mediaUrl) {
      setAudioError('El audio aún no está disponible.');
      return;
    }

    try {
      setAudioError(null);

      if (soundRef.current) {
        const statusResult = await soundRef.current.getStatusAsync();

        if (
          statusResult.isLoaded
          && statusResult.isPlaying
        ) {
          await soundRef.current.pauseAsync();
          setIsPlaying(false);
          return;
        }

        if (statusResult.isLoaded) {
          await soundRef.current.playAsync();
          setIsPlaying(true);
          return;
        }
      }

      const {
        sound,
        status: initialStatus,
      } = await Audio.Sound.createAsync(
        {
          uri: mediaUrl,
        },
        {
          shouldPlay: true,
          progressUpdateIntervalMillis: 250,
        },
        (nextStatus) => {
          if (!nextStatus.isLoaded) {
            return;
          }

          if (typeof nextStatus.durationMillis === 'number') {
            setPlaybackDuration(
              formatDuration(nextStatus.durationMillis),
            );
          }

          setIsPlaying(nextStatus.isPlaying);

          if (nextStatus.didJustFinish) {
            setIsPlaying(false);
            void sound.setPositionAsync(0).catch(() => {
              // Reiniciar es de mejor esfuerzo.
            });
          }
        },
      );

      soundRef.current = sound;

      if (
        initialStatus.isLoaded
        && typeof initialStatus.durationMillis === 'number'
      ) {
        setPlaybackDuration(
          formatDuration(initialStatus.durationMillis),
        );
      }

      setIsPlaying(true);
    } catch (error) {
      setIsPlaying(false);
      setAudioError(
        error instanceof Error
          ? error.message
          : 'No fue posible reproducir la nota de voz.',
      );
    }
  };

  return (
    <View
      style={[
        styles.container,
        isUser
          ? styles.containerUser
          : styles.containerOther,
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onLongPress={onLongPress}
        style={styles.touchable}
      >
        {senderName && !isUser ? (
          <View style={styles.senderRow}>
            <Text style={styles.senderName}>
              {senderName}
            </Text>

            {senderVerified ? (
              <VerifiedBadge size={12} />
            ) : null}
          </View>
        ) : null}

        <View
          style={[
            styles.bubble,
            isUser
              ? styles.bubbleUser
              : styles.bubbleOther,
            !isUser && isAI
              ? styles.bubbleAI
              : null,
          ]}
        >
          {sentByAi ? (
            <View style={styles.sentByAiBadge}>
              <Bot
                size={10}
                color={colors.neutral.white}
              />

              <Text style={styles.sentByAiBadgeText}>
                IA
              </Text>
            </View>
          ) : null}

          {replyTo ? (
            <View
              style={[
                styles.replyContainer,
                isUser
                  ? styles.replyUser
                  : styles.replyOther,
              ]}
            >
              <View style={styles.replyBar} />

              <View style={styles.flex}>
                <Text
                  style={[
                    styles.replySender,
                    isUser
                      ? styles.replySenderUser
                      : styles.replySenderOther,
                  ]}
                >
                  {replyTo.sender}
                </Text>

                <Text
                  style={[
                    styles.replyText,
                    {
                      color: isUser
                        ? '#E2D8FF'
                        : colors.neutral.gray600,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {replyTo.text}
                </Text>
              </View>
            </View>
          ) : null}

          {isDestroyed ? (
            <Text
              style={[
                styles.destroyedText,
                {
                  color: isUser
                    ? '#E2D8FF'
                    : colors.neutral.gray500,
                },
              ]}
            >
              Este mensaje fue destruido
            </Text>
          ) : (
            <>
              {type === 'text' ? (
                <Text
                  style={[
                    styles.messageText,
                    isUser
                      ? styles.textUser
                      : styles.textOther,
                  ]}
                >
                  {text}
                </Text>
              ) : null}

              {type === 'image' ? (
                <View style={styles.imageWrapper}>
                  {mediaUrl ? (
                    <Image
                      source={{
                        uri: mediaUrl,
                      }}
                      style={styles.image}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Text style={styles.imagePlaceholderText}>
                        Imagen no disponible
                      </Text>
                    </View>
                  )}

                  {text ? (
                    <Text
                      style={[
                        styles.imageCaption,
                        isUser
                          ? styles.textUser
                          : styles.textOther,
                      ]}
                    >
                      {text}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {type === 'file' ? (
                <View style={styles.fileRow}>
                  <View
                    style={[
                      styles.fileIconWrap,
                      isUser
                        ? styles.fileIconWrapUser
                        : styles.fileIconWrapOther,
                    ]}
                  >
                    <FileText
                      size={20}
                      color={
                        isUser
                          ? colors.brand.primary
                          : colors.neutral.white
                      }
                    />
                  </View>

                  <View style={styles.flex}>
                    <Text
                      style={[
                        styles.fileName,
                        isUser
                          ? styles.textUser
                          : styles.textOther,
                      ]}
                      numberOfLines={1}
                    >
                      {fileName || 'Archivo adjunto'}
                    </Text>

                    <Text
                      style={[
                        styles.fileSize,
                        {
                          color: isUser
                            ? '#DDD6FE'
                            : colors.neutral.gray600,
                        },
                      ]}
                    >
                      {fileSize || 'Archivo'}
                    </Text>
                  </View>
                </View>
              ) : null}

              {type === 'audio' ? (
                <View>
                  <View style={styles.audioRow}>
                    <TouchableOpacity
                      onPress={() => {
                        void handleToggleAudio();
                      }}
                      style={[
                        styles.audioPlayBtn,
                        isUser
                          ? styles.audioPlayBtnUser
                          : styles.audioPlayBtnOther,
                      ]}
                      activeOpacity={0.7}
                      accessibilityLabel={
                        isPlaying
                          ? 'Pausar nota de voz'
                          : 'Reproducir nota de voz'
                      }
                    >
                      {isPlaying ? (
                        <Pause
                          size={16}
                          color={
                            isUser
                              ? colors.brand.primary
                              : colors.neutral.text
                          }
                        />
                      ) : (
                        <Play
                          size={16}
                          color={
                            isUser
                              ? colors.brand.primary
                              : colors.neutral.text
                          }
                          style={styles.playIcon}
                        />
                      )}
                    </TouchableOpacity>

                    <View style={styles.waveformContainer}>
                      {Array.from(
                        {
                          length: 12,
                        },
                        (_, index) => (
                          <View
                            key={index}
                            style={[
                              styles.waveBar,
                              {
                                height: 4 + (index * 3) % 10,
                                backgroundColor: isPlaying
                                  ? (
                                      isUser
                                        ? colors.neutral.white
                                        : colors.brand.primary
                                    )
                                  : (
                                      isUser
                                        ? `${colors.brand.primary}80`
                                        : colors.neutral.gray300
                                    ),
                              },
                            ]}
                          />
                        ),
                      )}
                    </View>

                    <Text
                      style={[
                        styles.audioDuration,
                        {
                          color: isUser
                            ? '#E2D8FF'
                            : colors.neutral.gray600,
                        },
                      ]}
                    >
                      {playbackDuration || audioDuration || '0:00'}
                    </Text>
                  </View>

                  {audioError ? (
                    <Text
                      style={[
                        styles.audioError,
                        {
                          color: isUser
                            ? '#FEE2E2'
                            : colors.semantic.error,
                        },
                      ]}
                    >
                      {audioError}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </>
          )}

          <View style={styles.metaRow}>
            {isEdited ? (
              <Text
                style={[
                  styles.editedText,
                  {
                    color: isUser
                      ? '#DDD6FE'
                      : colors.neutral.gray500,
                  },
                ]}
              >
                (editado)
              </Text>
            ) : null}

            <Text
              style={[
                styles.time,
                isUser
                  ? styles.timeUser
                  : styles.timeOther,
              ]}
            >
              {time}
            </Text>

            {isUser ? (
              <View style={styles.statusCheck}>
                {status === 'sent' ? (
                  <Check
                    size={12}
                    color="#DDD6FE"
                  />
                ) : null}

                {status === 'delivered' ? (
                  <CheckCheck
                    size={12}
                    color="#DDD6FE"
                  />
                ) : null}

                {status === 'read' ? (
                  <CheckCheck
                    size={12}
                    color={colors.neutral.white}
                  />
                ) : null}
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>

      {showCatalog ? (
        <AiCatalogCards
          onContact={onContactCatalogItem}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    marginBottom: 8,
    width: '100%',
  },
  containerUser: {
    alignItems: 'flex-end',
  },
  containerOther: {
    alignItems: 'flex-start',
  },
  touchable: {
    maxWidth: '85%',
  },
  senderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  senderName: {
    color: colors.neutral.gray600,
    fontSize: 11,
    fontWeight: '400',
    marginBottom: 2,
    marginLeft: 12,
  },
  bubble: {
    borderRadius: 18,
    elevation: 1,
    paddingBottom: 6,
    paddingHorizontal: 12,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: {
      height: 1,
      width: 0,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  bubbleUser: {
    backgroundColor: colors.brand.primary,
    borderBottomRightRadius: 2,
  },
  bubbleOther: {
    backgroundColor: colors.neutral.white,
    borderBottomLeftRadius: 2,
    borderColor: colors.neutral.gray200,
    borderWidth: 1,
  },
  bubbleAI: {
    backgroundColor: `${colors.brand.primary}15`,
    borderColor: `${colors.brand.primary}30`,
  },
  flex: {
    flex: 1,
  },
  sentByAiBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 3,
    marginBottom: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  sentByAiBadgeText: {
    color: colors.neutral.white,
    fontSize: 9,
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  textUser: {
    color: colors.neutral.white,
  },
  textOther: {
    color: colors.neutral.text,
  },
  replyContainer: {
    borderRadius: 8,
    flexDirection: 'row',
    marginBottom: 8,
    overflow: 'hidden',
    padding: 6,
  },
  replyUser: {
    backgroundColor: '#5219C4',
  },
  replyOther: {
    backgroundColor: colors.neutral.gray50,
    borderColor: colors.neutral.gray200,
    borderWidth: 1,
  },
  replyBar: {
    backgroundColor: colors.brand.primary,
    borderRadius: 1.5,
    marginRight: 8,
    width: 3,
  },
  replySender: {
    fontSize: 11,
    fontWeight: '400',
    marginBottom: 2,
  },
  replySenderUser: {
    color: colors.neutral.white,
  },
  replySenderOther: {
    color: colors.brand.primary,
  },
  replyText: {
    fontSize: 12,
  },
  destroyedText: {
    fontSize: 13,
    fontStyle: 'italic',
    marginVertical: 2,
  },
  imageWrapper: {
    overflow: 'hidden',
    width: 200,
  },
  image: {
    borderRadius: 12,
    height: 140,
    marginBottom: 6,
    width: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.neutral.gray100,
    borderColor: colors.neutral.gray200,
    borderRadius: 12,
    borderWidth: 1,
    height: 140,
    justifyContent: 'center',
    marginBottom: 6,
    width: '100%',
  },
  imagePlaceholderText: {
    color: colors.neutral.gray600,
    fontSize: 11,
    fontWeight: '400',
  },
  imageCaption: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  fileRow: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: 4,
    width: 200,
  },
  fileIconWrap: {
    alignItems: 'center',
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    marginRight: 10,
    width: 38,
  },
  fileIconWrapUser: {
    backgroundColor: colors.neutral.white,
  },
  fileIconWrapOther: {
    backgroundColor: colors.brand.primary,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '400',
  },
  fileSize: {
    fontSize: 11,
    marginTop: 2,
  },
  audioRow: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: 4,
    width: 210,
  },
  audioPlayBtn: {
    alignItems: 'center',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    marginRight: 10,
    width: 32,
  },
  audioPlayBtnUser: {
    backgroundColor: colors.neutral.white,
  },
  audioPlayBtnOther: {
    backgroundColor: colors.neutral.gray100,
    borderColor: colors.neutral.gray200,
    borderWidth: 1,
  },
  playIcon: {
    marginLeft: 2,
  },
  waveformContainer: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 3,
    marginRight: 10,
  },
  waveBar: {
    borderRadius: 1,
    flex: 1,
  },
  audioDuration: {
    fontSize: 11,
    fontWeight: '400',
  },
  audioError: {
    fontSize: 10,
    lineHeight: 14,
    marginTop: 3,
    maxWidth: 210,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  editedText: {
    fontSize: 10,
    fontStyle: 'italic',
    marginRight: 4,
  },
  time: {
    fontSize: 9,
    marginRight: 4,
  },
  timeUser: {
    color: `${colors.neutral.white}B3`,
  },
  timeOther: {
    color: colors.neutral.gray600,
  },
  statusCheck: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
