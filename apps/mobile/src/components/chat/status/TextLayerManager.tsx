import { StyleSheet, TextInput } from 'react-native';
import { StatusTextLayer } from '../../../mocks/statuses';
import DraggableLayer from './DraggableLayer';
import MentionText from './MentionText';

interface TextLayerManagerProps {
  layers: StatusTextLayer[];
  selectedId: string | null;
  stage: { width: number; height: number };
  onSelect: (id: string) => void;
  onChangeContent: (id: string, content: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onRemove: (id: string) => void;
}

/**
 * Capas de texto del estado. La seleccionada se edita en un `TextInput`
 * sobre el propio lienzo; las demás se dibujan como texto, con las menciones
 * a contactos en morado.
 */
export default function TextLayerManager({
  layers,
  selectedId,
  stage,
  onSelect,
  onChangeContent,
  onMove,
  onRemove,
}: TextLayerManagerProps) {
  return (
    <>
      {layers.map((layer) => {
        const isSelected = layer.id === selectedId;
        const textStyle = {
          fontSize: layer.fontSize,
          fontWeight: layer.fontWeight,
          color: layer.color,
          lineHeight: layer.fontSize * 1.3,
        } as const;

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
            style={styles.layer}
          >
            {isSelected ? (
              <TextInput
                style={[styles.input, textStyle]}
                value={layer.content}
                onChangeText={(content) => onChangeContent(layer.id, content)}
                placeholder="Texto..."
                placeholderTextColor={`${layer.color}99`}
                multiline
                textAlign="center"
              />
            ) : (
              <MentionText
                content={layer.content || 'Texto...'}
                style={[
                  styles.text,
                  textStyle,
                  !layer.content && styles.placeholder,
                ]}
              />
            )}
          </DraggableLayer>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  layer: { width: '84%' },
  input: { textAlign: 'center', padding: 0 },
  text: { textAlign: 'center' },
  placeholder: { opacity: 0.6 },
});
