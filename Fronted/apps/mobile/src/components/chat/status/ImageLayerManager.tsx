import { Image, Text, View, StyleSheet } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Minus, Plus } from 'lucide-react-native';
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
  onTransform: (
    id: string,
    scale: number,
    rotation: number,
  ) => void;
  onRemove: (id: string) => void;
}

const clampSize = (size: number) => Math.min(IMAGE_LAYER_MAX, Math.max(IMAGE_LAYER_MIN, size));

/**
 * Capas de imagen del estado; la seleccionada muestra los botones de tamaño.
 */
export default function ImageLayerManager({
  layers,
  selectedId,
  stage,
  onSelect,
  onResize,
  onMove,
  onTransform,
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
            scale={layer.scale}
            rotation={layer.rotation}
            stage={stage}
            selected={isSelected}
            onSelect={() => onSelect(layer.id)}
            onMove={(x, y) => onMove(layer.id, x, y)}
            onTransform={(scale, rotation) => {
              onTransform(
                layer.id,
                scale,
                rotation,
              );
            }}
            onRemove={() => onRemove(layer.id)}
          >
            <View style={styles.imageContent}>
              <Image
                source={{ uri: layer.uri }}
                style={[
                  styles.image,
                  { width: layer.size, height: layer.size },
                ]}
                resizeMode="cover"
              />
              {layer.source === 'commercial_offer'
              && layer.commercialOfferTitle ? (
                <View style={styles.commercialLabel}>
                  <Text
                    style={styles.commercialLabelText}
                    numberOfLines={2}
                  >
                    {layer.commercialOfferTitle}
                  </Text>
                </View>
              ) : null}
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
  imageContent: {
    alignItems: 'center',
  },
  image: {
    borderRadius: radii.md,
  },
  commercialLabel: {
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderRadius: radii.sm,
    marginTop: 6,
    maxWidth: 220,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  commercialLabelText: {
    color: colors.neutral.white,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
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
