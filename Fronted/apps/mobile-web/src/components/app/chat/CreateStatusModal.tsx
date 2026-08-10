'use client';

import { useState, useEffect } from 'react';
import {
  STATUS_BACKGROUNDS,
  STATUS_TEXT_COLORS,
  type StatusItem,
  type StatusProductLink,
} from '@/mocks/statuses';
import { CURRENT_USER } from '@/mocks/currentUser';
import type { ContactItem } from '@/mocks/contacts';
import StatusPreviewStage from './status/StatusPreviewStage';
import StatusToolPanel from './status/StatusToolPanel';
import { StatusVisibility } from './status/StatusPrivacySection';
import { useStatusLayers } from './status/useStatusLayers';
import ProductLinkSelector from './ProductLinkSelector';

const MOCK_PHOTO = 'https://picsum.photos/id/1069/600/800';
const MENTION_TOKEN = /@[^@\n]*$/;

const initialsOf = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

interface CreateStatusModalProps {
  visible: boolean;
  onPublish: (status: Omit<StatusItem, 'id' | 'timestamp' | 'viewed'>) => void;
  onClose: () => void;
}

export default function CreateStatusModal({
  visible,
  onPublish,
  onClose,
}: CreateStatusModalProps) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [background, setBackground] = useState(STATUS_BACKGROUNDS[0]);
  const [lastTextColor, setLastTextColor] = useState(STATUS_TEXT_COLORS[0]);
  const [product, setProduct] = useState<StatusProductLink | null>(null);
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  const [visibility, setVisibility] = useState<StatusVisibility>('all');
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const layers = useStatusLayers(lastTextColor);
  const { texts, images, stickers, music, selection, selectedText } = layers;

  useEffect(() => {
    if (!visible) return;
    setPhoto(null);
    setBackground(STATUS_BACKGROUNDS[0]);
    setLastTextColor(STATUS_TEXT_COLORS[0]);
    setProduct(null);
    setSelectorVisible(false);
    setMentionQuery(null);
    setVisibility('all');
    setSelectedContactIds([]);
    setSelectedCategoryId(null);
    layers.reset(STATUS_TEXT_COLORS[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  const handleTextChange = (content: string) => {
    if (!selectedText) return;
    layers.patchText(selectedText.id, { content });
    const match = MENTION_TOKEN.exec(content);
    setMentionQuery(match && match[0].length <= 21 ? match[0].slice(1) : null);
  };

  const insertMention = (contact: ContactItem) => {
    if (!selectedText) return;
    layers.patchText(selectedText.id, {
      content: selectedText.content.replace(MENTION_TOKEN, `@${contact.name} `),
    });
    setMentionQuery(null);
  };

  const changeTextColor = (color: string) => {
    setLastTextColor(color);
    if (selectedText) layers.patchText(selectedText.id, { color });
  };

  const canPublish =
    texts.some((layer) => layer.content.trim()) ||
    !!photo ||
    images.length > 0 ||
    stickers.length > 0;

  const handlePublish = () => {
    const first = texts[0];

    onPublish({
      authorId: 'me',
      authorName: CURRENT_USER.name,
      authorInitials: initialsOf(CURRENT_USER.name),
      authorColor: '#F3E8FF',
      type: photo ? 'photo' : 'text',
      text: first?.content.trim() ?? '',
      photoUrl: photo,
      bgColor: photo ? null : background,
      linkedProduct: product,
      textPosition: { x: first?.x ?? 50, y: first?.y ?? 50 },
      textSize: first?.fontSize ?? 24,
      textWeight: first?.fontWeight ?? '400',
      textColor: first?.color ?? lastTextColor,
      textAlign: first?.align ?? 'center',
      textLayers: texts.filter((layer) => layer.content.trim()),
      imageLayers: images,
      stickerLayers: stickers,
      music,
      visibility,
      selectedContactIds,
      selectedCategoryId: selectedCategoryId || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col md:flex-row select-none">
      <StatusPreviewStage
        background={background}
        photo={photo}
        texts={texts}
        images={images}
        stickers={stickers}
        music={music}
        selection={selection}
        onSelect={layers.setSelection}
        onMoveText={(id, x, y) => layers.patchText(id, { x, y })}
        onMoveImage={layers.moveImage}
        onMoveSticker={layers.moveSticker}
        onResizeImage={layers.resizeImage}
        onRemoveLayer={layers.removeLayer}
        onRemovePhoto={() => setPhoto(null)}
        onRemoveMusic={() => layers.setMusic(null)}
      />

      <StatusToolPanel
        text={selectedText?.content ?? ''}
        onChangeText={handleTextChange}
        hasTextSelection={!!selectedText}
        textCount={texts.length}
        onAddText={layers.addText}
        mentionQuery={mentionQuery}
        onSelectMention={insertMention}
        textSize={selectedText?.fontSize ?? 24}
        onChangeSize={(size) => selectedText && layers.patchText(selectedText.id, { fontSize: size })}
        bold={selectedText?.fontWeight === '700'}
        onToggleBold={() =>
          selectedText &&
          layers.patchText(selectedText.id, {
            fontWeight: selectedText.fontWeight === '700' ? '400' : '700',
          })
        }
        align={selectedText?.align ?? 'center'}
        onChangeAlign={(align) => selectedText && layers.patchText(selectedText.id, { align })}
        textColor={selectedText?.color ?? lastTextColor}
        onChangeTextColor={changeTextColor}
        background={background}
        onChangeBackground={setBackground}
        hasPhoto={!!photo}
        onPickPhoto={() => setPhoto(MOCK_PHOTO)}
        onRemovePhoto={() => setPhoto(null)}
        imageCount={images.length}
        onAddImage={layers.addImage}
        stickerCount={stickers.length}
        onAddSticker={(sticker) => layers.addSticker(sticker.id)}
        music={music}
        onSelectMusic={(song) =>
          layers.setMusic({ id: song.id, title: song.title, artist: song.artist })
        }
        onRemoveMusic={() => layers.setMusic(null)}
        product={product}
        onLinkProduct={() => setSelectorVisible(true)}
        onRemoveProduct={() => setProduct(null)}
        visibility={visibility}
        onChangeVisibility={setVisibility}
        selectedContactIds={selectedContactIds}
        onChangeSelectedContacts={setSelectedContactIds}
        selectedCategoryId={selectedCategoryId}
        onChangeSelectedCategory={setSelectedCategoryId}
        canPublish={canPublish}
        onClose={onClose}
        onPublish={handlePublish}
      />

      <ProductLinkSelector
        visible={selectorVisible}
        selectedId={product?.id}
        onLink={(linked) => {
          setProduct(linked);
          setSelectorVisible(false);
        }}
        onClose={() => setSelectorVisible(false)}
      />
    </div>
  );
}
