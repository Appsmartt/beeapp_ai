'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import {
  StatusItem,
  StatusProductLink,
  STATUS_BG_COLORS,
  STATUS_TEXT_COLORS,
} from '@/mocks/statuses';
import { CURRENT_USER } from '@/mocks/currentUser';
import StatusEditorToolbar from './StatusEditorToolbar';
import ProductLinkSelector from './ProductLinkSelector';

const MOCK_PHOTO = 'https://picsum.photos/id/1069/600/800';

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
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState(STATUS_BG_COLORS[0]);
  const [textColor, setTextColor] = useState(STATUS_TEXT_COLORS[0]);
  const [textSize, setTextSize] = useState(24);
  const [bold, setBold] = useState(false);
  const [product, setProduct] = useState<StatusProductLink | null>(null);
  const [selectorVisible, setSelectorVisible] = useState(false);

  // Position percentage of text inside preview box
  const [textPos, setTextPos] = useState({ x: 50, y: 50 });
  const isDraggingRef = useRef(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;
    setText('');
    setPhoto(null);
    setBgColor(STATUS_BG_COLORS[0]);
    setTextColor(STATUS_TEXT_COLORS[0]);
    setTextSize(24);
    setBold(false);
    setProduct(null);
    setTextPos({ x: 50, y: 50 });
  }, [visible]);

  if (!visible) return null;

  const handlePointerDown = () => {
    isDraggingRef.current = true;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = Math.max(10, Math.min(90, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(10, Math.min(90, ((e.clientY - rect.top) / rect.height) * 100));
    setTextPos({ x, y });
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handlePublish = () => {
    onPublish({
      authorId: 'me',
      authorName: CURRENT_USER.name,
      authorInitials: CURRENT_USER.initials,
      authorColor: '#F3E8FF',
      type: photo ? 'photo' : 'text',
      text: text.trim(),
      photoUrl: photo,
      bgColor: photo ? null : bgColor,
      linkedProduct: product,
      textPosition: textPos,
      textSize,
      textWeight: bold ? '700' : '400',
      textColor,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950 flex flex-col justify-between max-w-md mx-auto p-3 overflow-hidden select-none">
      {/* Header bar */}
      <div className="flex items-center justify-between z-10 py-1 px-2">
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-sm font-semibold text-white">Crear estado</h2>

        <button
          type="button"
          onClick={handlePublish}
          disabled={!text.trim()}
          className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-semibold disabled:opacity-50 hover:bg-brand-dark transition-colors"
        >
          Publicar
        </button>
      </div>

      {/* Preview Stage */}
      <div
        ref={previewRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="relative flex-1 my-2 rounded-2xl overflow-hidden flex items-center justify-center shadow-2xl transition-colors cursor-crosshair"
        style={{ backgroundColor: photo ? '#000000' : bgColor }}
      >
        {photo ? (
          <>
            <img src={photo} alt="Preview background" className="absolute inset-0 w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => setPhoto(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 z-20"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="absolute top-3 right-3 opacity-60 text-white">
            <ImageIcon className="w-5 h-5" />
          </div>
        )}

        {/* Draggable Text Container */}
        <div
          onPointerDown={handlePointerDown}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 w-[84%] text-center cursor-move p-2 rounded-xl hover:ring-1 hover:ring-white/30 transition-shadow"
          style={{
            top: `${textPos.y}%`,
            left: `${textPos.x}%`,
          }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribe tu estado..."
            rows={3}
            className="w-full bg-transparent outline-none text-center resize-none placeholder:text-white/60 drop-shadow-md"
            style={{
              fontSize: `${textSize}px`,
              fontWeight: bold ? 700 : 400,
              color: textColor,
              lineHeight: 1.3,
            }}
          />
        </div>
      </div>

      {/* Toolbar & controls */}
      <StatusEditorToolbar
        textSize={textSize}
        onChangeSize={setTextSize}
        bold={bold}
        onToggleBold={() => setBold(!bold)}
        textColor={textColor}
        onChangeTextColor={setTextColor}
        showBackgrounds={!photo}
        bgColor={bgColor}
        onChangeBgColor={setBgColor}
        hasPhoto={!!photo}
        onPickPhoto={() => setPhoto(MOCK_PHOTO)}
        onRemovePhoto={() => setPhoto(null)}
        product={product}
        onLinkProduct={() => setSelectorVisible(true)}
        onRemoveProduct={() => setProduct(null)}
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
