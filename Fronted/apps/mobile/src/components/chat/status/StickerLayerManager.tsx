import { View, StyleSheet } from 'react-native';
import { StatusStickerLayer } from '../../../mocks/statuses';
import { STICKER_LAYER_SIZE } from '../../../mocks/statusMedia';
import { getSticker } from './stickerCatalog';
import DraggableLayer from './DraggableLayer';

interface StickerLayerManagerProps {
  layers: StatusStickerLayer[];
  selectedId: string | null;
  stage: { width: number; height: number };
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onRemove: (id: string) => void;
}

/** Capas de sticker: ícono de Lucide sobre un círculo de color suave */
export default function StickerLayerManager({
  layers,
  selectedId,
  stage,
  onSelect,
  onMove,
  onRemove,
}: StickerLayerManagerProps) {
  return (
    <>
      {layers.map((layer) => {
        const sticker = getSticker(layer.stickerId);

        return (
          <DraggableLayer
            key={layer.id}
            x={layer.x}
            y={layer.y}
            stage={stage}
            selected={layer.id === selectedId}
            onSelect={() => onSelect(layer.id)}
            onMove={(x, y) => onMove(layer.id, x, y)}
            onRemove={() => onRemove(layer.id)}
          >
            <View style={[styles.bubble, { backgroundColor: sticker.background }]}>
              <sticker.Icon size={44} color={sticker.color} />
            </View>
          </DraggableLayer>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  bubble: {
    width: STICKER_LAYER_SIZE,
    height: STICKER_LAYER_SIZE,
    borderRadius: STICKER_LAYER_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
