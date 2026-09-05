import {
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {
  StatusTextLayer,
} from '../../../mocks/statuses';
import DraggableLayer from './DraggableLayer';
import MentionText from './MentionText';

interface TextLayerManagerProps {
  layers: StatusTextLayer[];
  selectedId: string | null;
  editingId: string | null;
  stage: {
    width: number;
    height: number;
  };
  onSelect: (id: string) => void;
  onStartEditing: (id: string) => void;
  onChangeContent: (
    id: string,
    content: string,
  ) => void;
  onMove: (
    id: string,
    x: number,
    y: number,
  ) => void;
  onTransform: (
    id: string,
    scale: number,
    rotation: number,
  ) => void;
  onRemove: (id: string) => void;
}

function getTextBoxWidth(
  content: string,
  fontSize: number,
  stageWidth: number,
): number {
  const longestLine = content
    .split('\n')
    .reduce(
      (longest, line) => Math.max(
        longest,
        line.length,
      ),
      1,
    );

  const estimatedWidth = (
    longestLine * fontSize * 0.62
  ) + 24;

  const maxWidth = stageWidth > 0
    ? stageWidth * 0.84
    : 300;

  return Math.max(
    72,
    Math.min(maxWidth, estimatedWidth),
  );
}

function getTextBoxMinHeight(
  content: string,
  fontSize: number,
): number {
  const lineCount = Math.max(
    1,
    content.split('\n').length,
  );

  return Math.max(
    fontSize * 1.35,
    lineCount * fontSize * 1.35,
  );
}

export default function TextLayerManager({
  layers,
  selectedId,
  editingId,
  stage,
  onSelect,
  onStartEditing,
  onChangeContent,
  onMove,
  onTransform,
  onRemove,
}: TextLayerManagerProps) {
  return (
    <>
      {layers.map((layer) => {
        const isSelected = layer.id === selectedId;
        const isEditing = layer.id === editingId;
        const content = layer.content || 'Texto...';

        const boxWidth = getTextBoxWidth(
          content,
          layer.fontSize,
          stage.width,
        );

        const minHeight = getTextBoxMinHeight(
          content,
          layer.fontSize,
        );

        const textStyle = {
          color: layer.color,
          fontSize: layer.fontSize,
          fontWeight: layer.fontWeight,
          lineHeight: layer.fontSize * 1.3,
        } as const;

        return (
          <DraggableLayer
            key={layer.id}
            x={layer.x}
            y={layer.y}
            scale={layer.scale}
            rotation={layer.rotation}
            stage={stage}
            selected={isSelected}
            editable={isEditing}
            onSelect={() => {
              onSelect(layer.id);
            }}
            onDoubleTap={() => {
              onStartEditing(layer.id);
            }}
            onMove={(x, y) => {
              onMove(
                layer.id,
                x,
                y,
              );
            }}
            onTransform={(scale, rotation) => {
              onTransform(
                layer.id,
                scale,
                rotation,
              );
            }}
            onRemove={() => onRemove(layer.id)}
            style={[
              styles.layer,
              {
                minHeight,
                width: boxWidth,
              },
            ]}
          >
            {isEditing ? (
              <TextInput
                autoFocus
                style={[
                  styles.input,
                  textStyle,
                  {
                    minHeight,
                    width: boxWidth,
                  },
                ]}
                value={layer.content}
                onChangeText={(nextContent) => {
                  onChangeContent(
                    layer.id,
                    nextContent,
                  );
                }}
                placeholder="Texto..."
                placeholderTextColor={`${layer.color}99`}
                multiline
                scrollEnabled={false}
                textAlign="center"
                textAlignVertical="center"
              />
            ) : (
              <View
                style={[
                  styles.textWrap,
                  {
                    minHeight,
                    width: boxWidth,
                  },
                ]}
              >
                <MentionText
                  content={content}
                  style={[
                    styles.text,
                    textStyle,
                    !layer.content
                      && styles.placeholder,
                  ]}
                />
              </View>
            )}
          </DraggableLayer>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  layer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    includeFontPadding: false,
    padding: 0,
    textAlign: 'center',
  },
  textWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
  },
  placeholder: {
    opacity: 0.6,
  },
});
