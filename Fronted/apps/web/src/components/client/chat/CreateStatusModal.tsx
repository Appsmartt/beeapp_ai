'use client';

import { useEffect, useState } from 'react';
import { getOwnedCommercialProfiles } from '@beeapp/api-client';
import type { CommercialOwnedProfile } from '@beeapp/shared-types';
import {
  STATUS_BACKGROUNDS,
  STATUS_TEXT_COLORS,
  type StatusItem,
  type StatusProductLink,
} from '@/lib/client/statuses';
import { useAuth } from '@/lib/auth/AuthProvider';
import type { ContactItem } from '@/lib/client/contacts';
import { getWebAuth } from '@/lib/client/liveData';
import StatusPreviewStage from './status/StatusPreviewStage';
import StatusToolPanel from './status/StatusToolPanel';
import { StatusVisibility } from './status/StatusPrivacySection';
import { useStatusLayers } from './status/useStatusLayers';
import ProductLinkSelector from './ProductLinkSelector';

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
  const { profile } = useAuth();
  const personalName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'Tú';
  const [photo, setPhoto] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [isVideoMedia, setIsVideoMedia] = useState(false);
  const [videoDurationSeconds, setVideoDurationSeconds] = useState<number | null>(null);
  const [businesses, setBusinesses] = useState<CommercialOwnedProfile[]>([]);
  const [actorBusinessId, setActorBusinessId] = useState<string>('');
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
    setMediaFile(null);
    setIsVideoMedia(false);
    setVideoDurationSeconds(null);
    setActorBusinessId('');
    setBackground(STATUS_BACKGROUNDS[0]);
    setLastTextColor(STATUS_TEXT_COLORS[0]);
    setProduct(null);
    setSelectorVisible(false);
    setMentionQuery(null);
    setVisibility('all');
    setSelectedContactIds([]);
    setSelectedCategoryId(null);
    layers.reset(STATUS_TEXT_COLORS[0]);

    void getWebAuth()
      .then((auth) => getOwnedCommercialProfiles(auth))
      .then((res) => setBusinesses(res.profiles || []))
      .catch(() => setBusinesses([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  const selectedBusiness = businesses.find((b) => b.id === actorBusinessId) || null;
  const authorName = selectedBusiness ? selectedBusiness.display_name : personalName;

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
    !!mediaFile ||
    images.length > 0 ||
    stickers.length > 0;

  const handlePublish = () => {
    const first = texts[0];
    const kind: StatusItem['type'] = mediaFile
      ? isVideoMedia
        ? 'video'
        : 'photo'
      : photo
        ? 'photo'
        : 'text';

    onPublish({
      authorId: selectedBusiness ? selectedBusiness.id : 'me',
      authorName,
      authorInitials: initialsOf(authorName),
      authorColor: '#F3E8FF',
      type: kind,
      text: first?.content.trim() ?? '',
      photoUrl: photo,
      mediaFile,
      videoDurationSeconds,
      actorType: selectedBusiness ? 'commercial_profile' : 'profile',
      actorCommercialProfileId: selectedBusiness ? selectedBusiness.id : null,
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
    <div className="fixed inset-0 z-50 flex select-none flex-col overflow-hidden bg-white md:flex-row">
      {businesses.length > 0 ? (
        <div className="z-30 flex shrink-0 items-center gap-2 border-b border-neutral-200 bg-white/95 px-3 py-2 text-xs backdrop-blur md:absolute md:left-4 md:top-4 md:z-50 md:max-w-[calc(100%-22rem)] md:rounded-full md:border md:py-1.5 md:shadow-md">
          <span className="shrink-0 font-semibold text-neutral-500">Publicar como:</span>
          <select
            value={actorBusinessId}
            onChange={(e) => setActorBusinessId(e.target.value)}
            className="min-w-0 flex-1 truncate bg-transparent font-bold text-brand-primary outline-none"
          >
            <option value="">{personalName} (Personal)</option>
            {businesses.map((biz) => (
              <option key={biz.id} value={biz.id}>
                {biz.display_name} (Negocio)
              </option>
            ))}
          </select>
        </div>
      ) : null}

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
        onRemovePhoto={() => {
          setPhoto(null);
          setMediaFile(null);
          setIsVideoMedia(false);
          setVideoDurationSeconds(null);
        }}
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
        onPickPhoto={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*,video/*';
          input.onchange = () => {
            const file = input.files?.[0];
            if (!file) return;
            setMediaFile(file);
            const isVid = file.type.startsWith('video/');
            setIsVideoMedia(isVid);
            if (isVid) {
              const objUrl = URL.createObjectURL(file);
              setPhoto(objUrl);
              const vid = document.createElement('video');
              vid.preload = 'metadata';
              vid.onloadedmetadata = () => {
                const dur = Number.isFinite(vid.duration) && vid.duration > 0 ? Math.round(vid.duration) : 10;
                setVideoDurationSeconds(Math.min(60, Math.max(1, dur)));
              };
              vid.src = objUrl;
            } else {
              setVideoDurationSeconds(null);
              const reader = new FileReader();
              reader.onload = () => setPhoto(typeof reader.result === 'string' ? reader.result : null);
              reader.readAsDataURL(file);
            }
          };
          input.click();
        }}
        onRemovePhoto={() => {
          setPhoto(null);
          setMediaFile(null);
          setIsVideoMedia(false);
          setVideoDurationSeconds(null);
        }}
        imageCount={images.length}
        onAddImage={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = () => {
            const file = input.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result === 'string') layers.addImage(reader.result);
            };
            reader.readAsDataURL(file);
          };
          input.click();
        }}
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
