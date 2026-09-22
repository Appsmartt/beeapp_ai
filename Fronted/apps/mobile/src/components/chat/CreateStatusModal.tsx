import {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  LayoutChangeEvent,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  ResizeMode,
  Video,
} from 'expo-av';
import {
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  colors,
  radii,
  spacing,
} from '@beeapp/design-system';
import {
  FileText,
  ImagePlus,
  X,
} from 'lucide-react-native';

import ScreenSafeArea from '../layout/ScreenSafeArea';
import StatusEditorToolbar from './StatusEditorToolbar';
import TextLayerManager from './status/TextLayerManager';
import ImageLayerManager from './status/ImageLayerManager';
import StickerLayerManager from './status/StickerLayerManager';
import MentionDropdown from './status/MentionDropdown';
import StickerPicker from './status/StickerPicker';
import {
  useStatusLayers,
} from './status/useStatusLayers';
import type {
  StatusTextBackground,
} from '@beeapp/shared-types';

import {
  STATUS_TEXT_COLORS,
} from './status/statusTypography';
import {
  STATUS_DEFAULT_FONT_FAMILY,
  STATUS_PASTEL_BACKGROUND_COLORS,
} from './status/statusTypography';
import {
  useStatusTypography,
} from './status/useStatusTypography';

const MENTION_TOKEN = /@[^@\n]*$/;

export interface SelectedStatusMedia {
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes: number | null;
  kind: 'image' | 'gif' | 'video';
  durationSeconds: number | null;
  traceId?: string | null;
  source?: 'camera' | 'gallery' | 'unknown';
}

export type StatusPublishingPhase =
  | 'idle'
  | 'preparing_image'
  | 'preparing_video'
  | 'uploading'
  | 'error';

export interface StatusEditorPublishDraft {
  textContent: string;
  backgroundColor: string;
  caption: string | null;
  media: SelectedStatusMedia | null;
  editorMetadata: Record<string, unknown>;
}

interface CreateStatusModalProps {
  visible: boolean;
  backgrounds: StatusTextBackground[];
  initialMedia?: SelectedStatusMedia | null;
  initialMode?: 'chooser' | 'editor' | 'text';
  isPublishing?: boolean;
  publishingPhase?: StatusPublishingPhase;
  publishingMessage?: string | null;
  onDismissPublishingError?: () => void;
  onPublish: (
    draft: StatusEditorPublishDraft,
  ) => Promise<void> | void;
  onClose: () => void;
}

function inferMediaKind(
  mimeType: string,
  fileName: string,
): SelectedStatusMedia['kind'] {
  const normalizedMimeType = mimeType.toLowerCase();
  const normalizedName = fileName.toLowerCase();

  if (
    normalizedMimeType === 'image/gif'
    || normalizedName.endsWith('.gif')
  ) {
    return 'gif';
  }

  if (normalizedMimeType.startsWith('video/')) {
    return 'video';
  }

  return 'image';
}

function getMediaName(
  asset: ImagePicker.ImagePickerAsset,
  kind: SelectedStatusMedia['kind'],
): string {
  if (asset.fileName?.trim()) {
    return asset.fileName.trim();
  }

  if (kind === 'video') {
    return 'estado-video.mp4';
  }

  if (kind === 'gif') {
    return 'estado.gif';
  }

  return 'estado.jpg';
}

function getMediaMimeType(
  asset: ImagePicker.ImagePickerAsset,
  kind: SelectedStatusMedia['kind'],
): string {
  if (asset.mimeType?.trim()) {
    return asset.mimeType.trim().toLowerCase();
  }

  if (kind === 'video') {
    return 'video/mp4';
  }

  if (kind === 'gif') {
    return 'image/gif';
  }

  return 'image/jpeg';
}

function serializeEditorMetadata(
  values: {
    texts: ReturnType<typeof useStatusLayers>['texts'];
    images: ReturnType<typeof useStatusLayers>['images'];
    stickers: ReturnType<typeof useStatusLayers>['stickers'];
    textFontFamily: string;
    backgroundColor: string;
  },
): Record<string, unknown> {
  return {
    version: 2,
    mentions: [],
    background_color: values.backgroundColor,
    text_font_family: values.textFontFamily,
    text_layers: values.texts
      .filter((layer) => layer.content.trim())
      .map((layer) => ({
        id: layer.id,
        content: layer.content.trim(),
        x: layer.x,
        y: layer.y,
        font_size: layer.fontSize,
        font_weight: layer.fontWeight,
        font_family: layer.fontFamily,
        color: layer.color,
        scale: layer.scale,
        rotation: layer.rotation,
      })),
    image_layers: values.images.map((layer) => ({
      id: layer.id,
      x: layer.x,
      y: layer.y,
      scale: layer.scale,
      rotation: layer.rotation,
      size: layer.size,
      color: layer.color,
    })),
    sticker_layers: values.stickers.map((layer) => ({
      id: layer.id,
      sticker_id: layer.stickerId,
      x: layer.x,
      y: layer.y,
      scale: layer.scale,
      rotation: layer.rotation,
    })),
  };
}

export default function CreateStatusModal({
  visible,
  backgrounds,
  initialMedia = null,
  initialMode = 'chooser',
  isPublishing = false,
  publishingPhase = 'idle',
  publishingMessage = null,
  onDismissPublishingError,
  onPublish,
  onClose,
}: CreateStatusModalProps) {
  const insets = useSafeAreaInsets();
  const [media, setMedia] = useState<
    SelectedStatusMedia | null
  >(null);
  const wasVisibleRef = useRef(false);
  const [bgColor, setBgColor] = useState<string>(
    STATUS_PASTEL_BACKGROUND_COLORS[0],
  );
  const [lastTextColor, setLastTextColor] = useState<string>(
    STATUS_TEXT_COLORS[0],
  );
  const [selectedFontFamily, setSelectedFontFamily] = useState(
    STATUS_DEFAULT_FONT_FAMILY,
  );
  const [sheet, setSheet] = useState<
    'stickers' | null
  >(null);
  const [mentionQuery, setMentionQuery] = useState<
    string | null
  >(null);
  const [stage, setStage] = useState({
    width: 0,
    height: 0,
  });

  const [editorMode, setEditorMode] = useState<
    'chooser' | 'editor'
  >('chooser');
  const [editingTextId, setEditingTextId] = useState<
    string | null
  >(null);

  const {
    fontsLoaded,
  } = useStatusTypography();

  const resolvedFontFamily = fontsLoaded
    ? selectedFontFamily
    : STATUS_DEFAULT_FONT_FAMILY;

  const layers = useStatusLayers(
    lastTextColor,
    resolvedFontFamily,
  );
  const {
    texts,
    images,
    stickers,
    selection,
    selectedText,
  } = layers;

  useEffect(() => {
    if (!visible) {
      wasVisibleRef.current = false;
      return;
    }

    if (wasVisibleRef.current) {
      return;
    }

    wasVisibleRef.current = true;

    setMedia(initialMedia);
    setBgColor(
      STATUS_PASTEL_BACKGROUND_COLORS[0],
    );
    setLastTextColor(STATUS_TEXT_COLORS[0]);
    setSelectedFontFamily(STATUS_DEFAULT_FONT_FAMILY);
    setSheet(null);
    setMentionQuery(null);
    const isTextStatus = (
      !initialMedia
      && initialMode === 'text'
    );

    setEditorMode(
      initialMedia || initialMode === 'editor' || isTextStatus
        ? 'editor'
        : 'chooser',
    );
    const initialTextId = layers.reset(
      STATUS_TEXT_COLORS[0],
      isTextStatus,
    );
    setEditingTextId(
      isTextStatus
        ? initialTextId
        : null,
    );
  }, [
    backgrounds,
    initialMedia,
    initialMode,
    visible,
  ]);

  const onStageLayout = (
    event: LayoutChangeEvent,
  ) => {
    const {
      width,
      height,
    } = event.nativeEvent.layout;

    setStage({
      width,
      height,
    });
  };

  const stopTextEditing = () => {
    Keyboard.dismiss();
    setEditingTextId(null);
    setMentionQuery(null);
  };

  const handleTextChange = (
    id: string,
    content: string,
  ) => {
    layers.patchText(id, {
      content,
    });

    const match = MENTION_TOKEN.exec(content);

    setMentionQuery(
      match && match[0].length <= 21
        ? match[0].slice(1)
        : null,
    );
  };

  const insertMention = (name: string) => {
    if (!selectedText) {
      return;
    }

    layers.patchText(selectedText.id, {
      content: selectedText.content.replace(
        MENTION_TOKEN,
        `@${name} `,
      ),
    });
    setMentionQuery(null);
  };

  const changeTextColor = (color: string) => {
    setLastTextColor(color);

    if (selectedText) {
      layers.patchText(selectedText.id, {
        color,
      });
    }
  };

  const changeTextFontFamily = (fontFamily: string) => {
    setSelectedFontFamily(fontFamily);
    layers.setAllTextFontFamilies(fontFamily);
  };

  const handlePickMedia = async () => {
    if (isPublishing) {
      return;
    }

    try {
      const permission = (
        await ImagePicker.requestMediaLibraryPermissionsAsync()
      );

      if (!permission.granted) {
        Alert.alert(
          'Permiso requerido',
          'Permite el acceso a tus fotos y videos para crear un estado.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        allowsMultipleSelection: false,
        quality: 1,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];
      const provisionalName = (
        asset.fileName?.trim()
        || 'estado'
      );
      const provisionalMimeType = (
        asset.mimeType?.trim()
        || ''
      );
      const kind = inferMediaKind(
        provisionalMimeType,
        provisionalName,
      );
      const name = getMediaName(asset, kind);
      const mimeType = getMediaMimeType(asset, kind);
      const durationSeconds = (
        kind === 'video'
        && typeof asset.duration === 'number'
        && asset.duration > 0
      )
        ? asset.duration / 1000
        : null;

      if (kind === 'video' && durationSeconds === null) {
        throw new Error(
          'No fue posible obtener la duración del video seleccionado.',
        );
      }

      setMedia({
        uri: asset.uri,
        name,
        mimeType,
        sizeBytes: asset.fileSize ?? null,
        kind,
        durationSeconds,
      });
      setEditorMode('editor');
    } catch (error) {
      Alert.alert(
        'No fue posible seleccionar el archivo',
        error instanceof Error
          ? error.message
          : 'Inténtalo nuevamente.',
      );
    }
  };

  const hasTextContent = texts.some(
    (layer) => Boolean(layer.content.trim()),
  );
  const hasContent = hasTextContent || Boolean(media);

  const handlePublish = async () => {
    if (!hasContent || isPublishing) {
      return;
    }

    const textContent = texts
      .map((layer) => layer.content.trim())
      .filter(Boolean)
      .join('\n');

    if (!media && !textContent) {
      Alert.alert(
        'Agrega contenido',
        'Los stickers y capas decorativas deben acompañar un texto o un archivo multimedia.',
      );
      return;
    }

    await onPublish({
      textContent,
      backgroundColor: bgColor,
      caption: textContent || null,
      media,
      editorMetadata: serializeEditorMetadata({
        texts,
        images,
        stickers,
        textFontFamily: resolvedFontFamily,
        backgroundColor: bgColor,
      }),
    });
  };

  const isMediaStatus = Boolean(media);

  const handleChooseText = () => {
    if (isPublishing) {
      return;
    }

    const initialTextId = layers.reset(
      STATUS_TEXT_COLORS[0],
      true,
    );
    setEditorMode('editor');
    setEditingTextId(initialTextId);
  };

  const handleChooseMedia = () => {
    void handlePickMedia();
  };

  const handleClose = () => {
    if (isPublishing) {
      return;
    }

    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.root}>
        {editorMode === 'chooser' ? (
          <ScreenSafeArea style={styles.chooserScreen}>
            <View style={styles.chooserHeader}>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.iconBtn}
                activeOpacity={0.7}
                accessibilityLabel="Cerrar creador de estado"
              >
                <X
                  size={22}
                  color={colors.neutral.text}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.chooserContent}>
              <Text style={styles.chooserTitle}>
                Crear estado
              </Text>

              <Text style={styles.chooserSubtitle}>
                Comparte un pensamiento, una foto o un video con tus seguidores.
              </Text>

              <TouchableOpacity
                style={styles.chooserOption}
                onPress={handleChooseText}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.chooserIcon,
                    styles.chooserTextIcon,
                  ]}
                >
                  <FileText
                    size={25}
                    color={colors.brand.primary}
                  />
                </View>

                <View style={styles.chooserOptionCopy}>
                  <Text style={styles.chooserOptionTitle}>
                    Texto
                  </Text>

                  <Text style={styles.chooserOptionSubtitle}>
                    Escribe y personaliza un estado.
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.chooserOption}
                onPress={handleChooseMedia}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.chooserIcon,
                    styles.chooserMediaIcon,
                  ]}
                >
                  <ImagePlus
                    size={25}
                    color={colors.neutral.white}
                  />
                </View>

                <View style={styles.chooserOptionCopy}>
                  <Text style={styles.chooserOptionTitle}>
                    Foto o video
                  </Text>

                  <Text style={styles.chooserOptionSubtitle}>
                    Elige un archivo desde tu galería.
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </ScreenSafeArea>
        ) : (
        <ScreenSafeArea style={styles.screen}>
          <View
            style={[
              styles.topBar,
              {
                marginTop: (insets.top / 2) + spacing.sm,
              },
            ]}
          >
            <TouchableOpacity
              onPress={handleClose}
              style={styles.iconBtn}
              activeOpacity={0.7}
              disabled={isPublishing}
            >
              <X
                size={22}
                color={colors.neutral.text}
              />
            </TouchableOpacity>

            <Text style={styles.topTitle}>
              Crear estado
            </Text>

            <TouchableOpacity
              style={[
                styles.publishBtn,
                (!hasContent || isPublishing)
                  && styles.publishBtnDisabled,
              ]}
              disabled={!hasContent || isPublishing}
              onPress={() => {
                void handlePublish();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.publishBtnText}>
                {isPublishing
                  ? 'Publicando...'
                  : 'Publicar'}
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.preview,
              !isMediaStatus && {
                backgroundColor: bgColor,
              },
            ]}
            onLayout={onStageLayout}
            onTouchStart={() => {
              if (editingTextId !== null) {
                stopTextEditing();
              }
            }}
          >
            {publishingPhase !== 'idle' ? (
              <View style={styles.publishStateOverlay}>
                <View style={styles.publishStateCard}>
                  {publishingPhase !== 'error' ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.brand.primary}
                    />
                  ) : null}

                  <Text style={styles.publishStateTitle}>
                    {publishingPhase === 'preparing_image'
                      ? 'Preparando imagen...'
                      : publishingPhase === 'preparing_video'
                        ? 'Comprimiendo video con audio...'
                        : publishingPhase === 'uploading'
                          ? 'Publicando historia...'
                          : 'No fue posible publicar'}
                  </Text>

                  <Text style={styles.publishStateMessage}>
                    {publishingMessage
                      || (publishingPhase === 'preparing_image'
                        ? 'Optimizando la imagen antes de subirla.'
                        : publishingPhase === 'preparing_video'
                          ? 'Manteniendo el audio y preparando el video.'
                          : publishingPhase === 'uploading'
                            ? 'Subiendo tu historia de forma segura.'
                            : 'Inténtalo nuevamente.')}
                  </Text>

                  {publishingPhase === 'error'
                  && onDismissPublishingError ? (
                    <TouchableOpacity
                      style={styles.publishStateAction}
                      onPress={onDismissPublishingError}
                      activeOpacity={0.8}
                      accessibilityLabel="Cerrar mensaje de error de publicación"
                    >
                      <Text style={styles.publishStateActionText}>
                        Entendido
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ) : null}

            {media?.kind === 'video' ? (
              <Video
                source={{
                  uri: media.uri,
                }}
                style={styles.photo}
                resizeMode={ResizeMode.COVER}
                isLooping
                shouldPlay
                isMuted={false}
              />
            ) : media ? (
              <Image
                source={{
                  uri: media.uri,
                }}
                style={styles.photo}
                resizeMode="cover"
              />
            ) : null}

            <ImageLayerManager
              layers={images}
              selectedId={
                selection?.kind === 'image'
                  ? selection.id
                  : null
              }
              stage={stage}
              onSelect={(id) => {
                layers.setSelection({
                  kind: 'image',
                  id,
                });
                stopTextEditing();
              }}
              onResize={layers.resizeImage}
              onMove={layers.moveImage}
              onTransform={(id, scale, rotation) => {
                layers.transformLayer(
                  'image',
                  id,
                  scale,
                  rotation,
                );
              }}
              onRemove={(id) => {
                layers.removeLayer('image', id);
              }}
            />

            <StickerLayerManager
              layers={stickers}
              selectedId={
                selection?.kind === 'sticker'
                  ? selection.id
                  : null
              }
              stage={stage}
              onSelect={(id) => {
                layers.setSelection({
                  kind: 'sticker',
                  id,
                });
                stopTextEditing();
              }}
              onMove={layers.moveSticker}
              onTransform={(id, scale, rotation) => {
                layers.transformLayer(
                  'sticker',
                  id,
                  scale,
                  rotation,
                );
              }}
              onRemove={(id) => {
                layers.removeLayer('sticker', id);
              }}
            />

            <TextLayerManager
              layers={texts}
              selectedId={layers.selectedTextId}
              editingId={editingTextId}
              stage={stage}
              onSelect={(id) => {
                layers.setSelection({
                  kind: 'text',
                  id,
                });
              }}
              onStartEditing={(id) => {
                layers.setSelection({
                  kind: 'text',
                  id,
                });
                setEditingTextId(id);
              }}
              onChangeContent={handleTextChange}
              onMove={(id, x, y) => {
                layers.patchText(id, {
                  x,
                  y,
                });
              }}
              onTransform={(id, scale, rotation) => {
                layers.transformLayer(
                  'text',
                  id,
                  scale,
                  rotation,
                );
              }}
              onRemove={(id) => {
                layers.removeLayer('text', id);
              }}
            />
          </View>

          {mentionQuery !== null ? (
            <MentionDropdown
              query={mentionQuery}
              onSelect={(contact) => {
                insertMention(contact.name);
              }}
            />
          ) : null}

          <StatusEditorToolbar
            hasTextSelection={Boolean(selectedText)}
            textSize={selectedText?.fontSize ?? 24}
            onChangeSize={(size) => {
              if (selectedText) {
                layers.patchText(selectedText.id, {
                  fontSize: size,
                });
              }
            }}
            bold={selectedText?.fontWeight === '700'}
            onToggleBold={() => {
              if (selectedText) {
                layers.patchText(selectedText.id, {
                  fontWeight: (
                    selectedText.fontWeight === '700'
                      ? '400'
                      : '700'
                  ),
                });
              }
            }}
            textColor={selectedText?.color ?? lastTextColor}
            onChangeTextColor={changeTextColor}
            selectedFontFamily={resolvedFontFamily}
            fontSelectorEnabled={fontsLoaded}
            onChangeTextFontFamily={changeTextFontFamily}
            showBackgrounds={!isMediaStatus}
            backgroundColors={[
              ...STATUS_PASTEL_BACKGROUND_COLORS,
            ]}
            bgColor={bgColor}
            onChangeBgColor={setBgColor}
            textCount={texts.length}
            onAddText={layers.addText}
            imageCount={images.length}
            onAddImage={layers.addImage}
            stickerCount={stickers.length}
            onOpenStickers={() => {
              setSheet('stickers');
            }}
            hasPhoto={Boolean(media)}
            onPickPhoto={() => {
              void handlePickMedia();
            }}
            onRemovePhoto={() => {
              setMedia(null);
            }}
          />
        </ScreenSafeArea>
        )}

        <StickerPicker
          visible={sheet === 'stickers'}
          onSelect={(sticker) => {
            layers.addSticker(sticker.id);
            setSheet(null);
          }}
          onClose={() => {
            setSheet(null);
          }}
        />
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.neutral.white,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.neutral.white,
  },
  chooserScreen: {
    flex: 1,
    backgroundColor: colors.neutral.white,
  },
  chooserHeader: {
    alignItems: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  chooserContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 72,
  },
  chooserTitle: {
    color: colors.neutral.text,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  chooserSubtitle: {
    color: colors.neutral.gray600,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  chooserOption: {
    alignItems: 'center',
    backgroundColor: colors.neutral.gray50,
    borderColor: colors.neutral.gray200,
    borderRadius: radii.xl,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: spacing.md,
    padding: spacing.md,
  },
  chooserIcon: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  chooserTextIcon: {
    backgroundColor: `${colors.brand.primary}16`,
  },
  chooserMediaIcon: {
    backgroundColor: colors.brand.primary,
  },
  chooserOptionCopy: {
    flex: 1,
    marginLeft: spacing.md,
  },
  chooserOptionTitle: {
    color: colors.neutral.text,
    fontSize: 16,
    fontWeight: '700',
  },
  chooserOptionSubtitle: {
    color: colors.neutral.gray600,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  iconBtn: {
    padding: 6,
  },
  topTitle: {
    color: colors.neutral.text,
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  publishBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: radii.lg,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  publishBtnDisabled: {
    backgroundColor: colors.neutral.gray400,
  },
  publishBtnText: {
    color: colors.neutral.white,
    fontSize: 14,
    fontWeight: '600',
  },
  preview: {
    borderRadius: 20,
    flex: 1,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.md,
    overflow: 'hidden',
  },
  photo: StyleSheet.absoluteFillObject,
  publishStateOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.84)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    padding: spacing.lg,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 20,
  },
  publishStateCard: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderColor: `${colors.brand.primary}24`,
    borderRadius: radii.xl,
    borderWidth: 1,
    maxWidth: 320,
    padding: spacing.lg,
    width: '100%',
  },
  publishStateTitle: {
    color: colors.neutral.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  publishStateMessage: {
    color: colors.neutral.gray600,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  publishStateAction: {
    backgroundColor: colors.brand.primary,
    borderRadius: radii.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  publishStateActionText: {
    color: colors.neutral.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
