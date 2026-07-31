import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Image, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors, spacing, radii } from '@beeapp/design-system';
import { X } from 'lucide-react-native';
import ScreenSafeArea from '../layout/ScreenSafeArea';
import StatusEditorToolbar from './StatusEditorToolbar';
import ProductLinkSelector from './ProductLinkSelector';
import TextLayerManager from './status/TextLayerManager';
import ImageLayerManager from './status/ImageLayerManager';
import StickerLayerManager from './status/StickerLayerManager';
import MentionDropdown from './status/MentionDropdown';
import MusicSelector from './status/MusicSelector';
import StickerPicker from './status/StickerPicker';
import MusicChip from './status/MusicChip';
import { useStatusLayers } from './status/useStatusLayers';
import { StatusItem, StatusProductLink, STATUS_BG_COLORS, STATUS_TEXT_COLORS } from '../../mocks/statuses';
import { CURRENT_USER } from '../../mocks/currentUser';

const MOCK_PHOTO = 'https://picsum.photos/id/1069/600/800';
const MENTION_TOKEN = /@[^@\n]*$/;

interface CreateStatusModalProps {
  visible: boolean;
  onPublish: (status: Omit<StatusItem, 'id' | 'timestamp' | 'viewed'>) => void;
  onClose: () => void;
}

/** Full screen status editor: capas de texto, imagen y stickers sobre el lienzo */
export default function CreateStatusModal({ visible, onPublish, onClose }: CreateStatusModalProps) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState(STATUS_BG_COLORS[0]);
  const [lastTextColor, setLastTextColor] = useState(STATUS_TEXT_COLORS[0]);
  const [product, setProduct] = useState<StatusProductLink | null>(null);
  const [sheet, setSheet] = useState<'product' | 'music' | 'stickers' | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [stage, setStage] = useState({ width: 0, height: 0 });

  const layers = useStatusLayers(lastTextColor);
  const { texts, images, stickers, music, selection, selectedText } = layers;

  // Cada vez que se abre, el editor arranca en blanco con una capa de texto
  useEffect(() => {
    if (!visible) return;
    setPhoto(null);
    setBgColor(STATUS_BG_COLORS[0]);
    setLastTextColor(STATUS_TEXT_COLORS[0]);
    setProduct(null);
    setSheet(null);
    setMentionQuery(null);
    layers.reset(STATUS_TEXT_COLORS[0]);
  }, [visible]);

  const onStageLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setStage({ width, height });
  };

  /** Al escribir, abre la lista de contactos si hay una "@" a medias */
  const handleTextChange = (id: string, content: string) => {
    layers.patchText(id, { content });
    const match = MENTION_TOKEN.exec(content);
    setMentionQuery(match && match[0].length <= 21 ? match[0].slice(1) : null);
  };

  const insertMention = (name: string) => {
    if (!selectedText) return;
    layers.patchText(selectedText.id, {
      content: selectedText.content.replace(MENTION_TOKEN, `@${name} `),
    });
    setMentionQuery(null);
  };

  const changeTextColor = (color: string) => {
    setLastTextColor(color);
    if (selectedText) layers.patchText(selectedText.id, { color });
  };

  const hasContent =
    texts.some((layer) => layer.content.trim()) || !!photo || images.length > 0 || stickers.length > 0;

  const handlePublish = () => {
    const first = texts[0];

    onPublish({
      authorId: 'me',
      authorName: CURRENT_USER.name,
      authorInitials: CURRENT_USER.initials,
      authorColor: '#F3E8FF',
      type: photo ? 'photo' : 'text',
      text: first?.content.trim() ?? '',
      photoUrl: photo,
      bgColor: photo ? null : bgColor,
      linkedProduct: product,
      textPosition: { x: first?.x ?? 50, y: first?.y ?? 50 },
      textSize: first?.fontSize ?? 24,
      textWeight: first?.fontWeight ?? '400',
      textColor: first?.color ?? lastTextColor,
      textLayers: texts.filter((layer) => layer.content.trim()),
      imageLayers: images,
      stickerLayers: stickers,
      music,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={styles.root}>
        <ScreenSafeArea style={styles.screen}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={onClose} style={styles.iconBtn} activeOpacity={0.7}>
              <X size={22} color={colors.neutral.text} />
            </TouchableOpacity>
            <Text style={styles.topTitle}>Crear estado</Text>
            <TouchableOpacity
              style={[styles.publishBtn, !hasContent && styles.publishBtnDisabled]}
              disabled={!hasContent}
              onPress={handlePublish}
              activeOpacity={0.8}
            >
              <Text style={styles.publishBtnText}>Publicar</Text>
            </TouchableOpacity>
          </View>

          {/* Lienzo: exactamente como se verá el estado */}
          <View style={[styles.preview, !photo && { backgroundColor: bgColor }]} onLayout={onStageLayout}>
            {photo && <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />}

            {music && <MusicChip music={music} onRemove={() => layers.setMusic(null)} />}

            <ImageLayerManager
              layers={images}
              selectedId={selection?.kind === 'image' ? selection.id : null}
              stage={stage}
              onSelect={(id) => layers.setSelection({ kind: 'image', id })}
              onResize={layers.resizeImage}
              onMove={layers.moveImage}
              onRemove={(id) => layers.removeLayer('image', id)}
            />

            <StickerLayerManager
              layers={stickers}
              selectedId={selection?.kind === 'sticker' ? selection.id : null}
              stage={stage}
              onSelect={(id) => layers.setSelection({ kind: 'sticker', id })}
              onMove={layers.moveSticker}
              onRemove={(id) => layers.removeLayer('sticker', id)}
            />

            <TextLayerManager
              layers={texts}
              selectedId={layers.selectedTextId}
              stage={stage}
              onSelect={(id) => layers.setSelection({ kind: 'text', id })}
              onChangeContent={handleTextChange}
              onMove={(id, x, y) => layers.patchText(id, { x, y })}
              onRemove={(id) => layers.removeLayer('text', id)}
            />
          </View>

          {mentionQuery !== null && (
            <MentionDropdown query={mentionQuery} onSelect={(contact) => insertMention(contact.name)} />
          )}

          <StatusEditorToolbar
            hasTextSelection={!!selectedText}
            textSize={selectedText?.fontSize ?? 24}
            onChangeSize={(size) => selectedText && layers.patchText(selectedText.id, { fontSize: size })}
            bold={selectedText?.fontWeight === '700'}
            onToggleBold={() =>
              selectedText &&
              layers.patchText(selectedText.id, {
                fontWeight: selectedText.fontWeight === '700' ? '400' : '700',
              })
            }
            textColor={selectedText?.color ?? lastTextColor}
            onChangeTextColor={changeTextColor}
            showBackgrounds={!photo}
            bgColor={bgColor}
            onChangeBgColor={setBgColor}
            textCount={texts.length}
            onAddText={layers.addText}
            imageCount={images.length}
            onAddImage={layers.addImage}
            stickerCount={stickers.length}
            onOpenStickers={() => setSheet('stickers')}
            hasMusic={!!music}
            onOpenMusic={() => setSheet('music')}
            hasPhoto={!!photo}
            onPickPhoto={() => setPhoto(MOCK_PHOTO)}
            onRemovePhoto={() => setPhoto(null)}
            product={product}
            onLinkProduct={() => setSheet('product')}
            onRemoveProduct={() => setProduct(null)}
          />
        </ScreenSafeArea>

        <ProductLinkSelector
          visible={sheet === 'product'}
          selectedId={product?.id}
          onLink={(linked) => {
            setProduct(linked);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />

        <MusicSelector
          visible={sheet === 'music'}
          selectedId={music?.id}
          onSelect={(song) => {
            layers.setMusic({ id: song.id, title: song.title, artist: song.artist });
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />

        <StickerPicker
          visible={sheet === 'stickers'}
          onSelect={(sticker) => {
            layers.addSticker(sticker.id);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.neutral.white },
  screen: { flex: 1, backgroundColor: colors.neutral.white },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  iconBtn: { padding: 6 },
  topTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.neutral.text },
  publishBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: radii.lg,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  publishBtnDisabled: { backgroundColor: colors.neutral.gray400 },
  publishBtnText: { fontSize: 14, fontWeight: '600', color: colors.neutral.white },
  preview: {
    flex: 1,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 20,
    overflow: 'hidden',
  },
  photo: StyleSheet.absoluteFillObject,
});
