import { View, StyleSheet } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { ImageIcon, Minus, Plus } from 'lucide-react-native';
import { colors, radii } from '@beeapp/design-system';
import { StatusImageLayer } from '../../../mocks/statuses';
import { IMAGE_LAYER_MAX, IMAGE_LAYER_MIN, IMAGE_LAYER_STEP } from '../../../mocks/statusMedia';
import DraggableLayer from './DraggableLayer';

interface ImageLayerManagerProps {
  layers: StatusImageLayer[];
  selectedId: string | null;
  stage: { width: number; height: number };
  onSelect: (id: string) => void;
  onResize: (id: string, size: number) => void;
  onMove: (id: string, x: number, y: number) => void;
  onRemove: (id: string) => void;
}

const clampSize = (size: number) => Math.min(IMAGE_LAYER_MAX, Math.max(IMAGE_LAYER_MIN, size));

/**
 * Capas de imagen del estado. Mock: cada una es un recuadro de color con el
 * ícono de imagen; la seleccionada muestra los botones de tamaño.
 */
export default function ImageLayerManager({
  layers,
  selectedId,
  stage,
  onSelect,
  onResize,
  onMove,
  onRemove,
}: ImageLayerManagerProps) {
  return (
    <>
      {layers.map((layer) => {
        const isSelected = layer.id === selectedId;

        return (
          <DraggableLayer
            key={layer.id}
            x={layer.x}
            y={layer.y}
            stage={stage}
            selected={isSelected}
            onSelect={() => onSelect(layer.id)}
            onMove={(x, y) => onMove(layer.id, x, y)}
            onRemove={() => onRemove(layer.id)}
          >
            <View
              style={[
                styles.placeholder,
                { width: layer.size, height: layer.size, backgroundColor: layer.color },
              ]}
            >
              <ImageIcon size={Math.max(20, layer.size * 0.28)} color={colors.neutral.gray600} />
            </View>

            {isSelected && (
              <View style={styles.sizeRow}>
                <TouchableOpacity
                  style={styles.sizeBtn}
                  onPress={() => onResize(layer.id, clampSize(layer.size - IMAGE_LAYER_STEP))}
                  activeOpacity={0.8}
                >
                  <Minus size={14} color={colors.neutral.white} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sizeBtn}
                  onPress={() => onResize(layer.id, clampSize(layer.size + IMAGE_LAYER_STEP))}
                  activeOpacity={0.8}
                >
                  <Plus size={14} color={colors.neutral.white} />
                </TouchableOpacity>
              </View>
            )}
          </DraggableLayer>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeRow: {
    position: 'absolute',
    bottom: -14,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  sizeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.neutral.gray800,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
