'use client';

import { useState, useEffect } from 'react';
import {
  STATUS_BACKGROUNDS,
  STATUS_TEXT_COLORS,
  type StatusItem,
  type StatusProductLink,
  type StatusTextAlign,
  type StatusTextPosition,
} from '@/mocks/statuses';
import { CURRENT_USER } from '@/mocks/currentUser';
import StatusPreviewStage from './status/StatusPreviewStage';
import StatusToolPanel from './status/StatusToolPanel';
import ProductLinkSelector from './ProductLinkSelector';

const MOCK_PHOTO = 'https://picsum.photos/id/1069/600/800';

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

/**
 * Editor de estados a pantalla completa: a la izquierda el lienzo 9:16 sobre
 * fondo claro, a la derecha el panel de herramientas por secciones.
 */
export default function CreateStatusModal({
  visible,
  onPublish,
  onClose,
}: CreateStatusModalProps) {
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [background, setBackground] = useState(STATUS_BACKGROUNDS[0]);
  const [textColor, setTextColor] = useState(STATUS_TEXT_COLORS[0]);
  const [textSize, setTextSize] = useState(24);
  const [bold, setBold] = useState(false);
  const [align, setAlign] = useState<StatusTextAlign>('center');
  const [product, setProduct] = useState<StatusProductLink | null>(null);
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [textPos, setTextPos] = useState<StatusTextPosition>({ x: 50, y: 50 });

  useEffect(() => {
    if (!visible) return;
    setText('');
    setPhoto(null);
    setBackground(STATUS_BACKGROUNDS[0]);
    setTextColor(STATUS_TEXT_COLORS[0]);
    setTextSize(24);
    setBold(false);
    setAlign('center');
    setProduct(null);
    setSelectorVisible(false);
    setTextPos({ x: 50, y: 50 });
  }, [visible]);

  if (!visible) return null;

  const handlePublish = () => {
    onPublish({
      authorId: 'me',
      authorName: CURRENT_USER.name,
      authorInitials: initialsOf(CURRENT_USER.name),
      authorColor: '#F3E8FF',
      type: photo ? 'photo' : 'text',
      text: text.trim(),
      photoUrl: photo,
      bgColor: photo ? null : background,
      linkedProduct: product,
      textPosition: textPos,
      textSize,
      textWeight: bold ? '700' : '400',
      textColor,
      textAlign: align,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col md:flex-row select-none">
      <StatusPreviewStage
        background={background}
        photo={photo}
        text={text}
        textColor={textColor}
        textSize={textSize}
        bold={bold}
        align={align}
        position={textPos}
        onMoveText={setTextPos}
        onRemovePhoto={() => setPhoto(null)}
      />

      <StatusToolPanel
        text={text}
        onChangeText={setText}
        textSize={textSize}
        onChangeSize={setTextSize}
        bold={bold}
        onToggleBold={() => setBold(!bold)}
        align={align}
        onChangeAlign={setAlign}
        textColor={textColor}
        onChangeTextColor={setTextColor}
        background={background}
        onChangeBackground={setBackground}
        hasPhoto={!!photo}
        onPickPhoto={() => setPhoto(MOCK_PHOTO)}
        onRemovePhoto={() => setPhoto(null)}
        product={product}
        onLinkProduct={() => setSelectorVisible(true)}
        onRemoveProduct={() => setProduct(null)}
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
