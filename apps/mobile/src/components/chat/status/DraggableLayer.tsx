import { ReactNode, useEffect } from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { Gesture, GestureDetector, TouchableOpacity } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { colors, radii } from '@beeapp/design-system';

interface DraggableLayerProps {
  /** Posición en porcentaje del lienzo */
  x: number;
  y: number;
  stage: { width: number; height: number };
  selected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onRemove: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const clampPercent = (value: number) => Math.min(95, Math.max(5, value));

/**
 * Capa suelta del editor de estados: se arrastra por el lienzo, se selecciona
 * al tocarla y muestra borde punteado y botón de eliminar cuando está activa.
 */
export default function DraggableLayer({
  x,
  y,
  stage,
  selected,
  onSelect,
  onMove,
  onRemove,
  children,
  style,
}: DraggableLayerProps) {
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  // El porcentaje guardado se traduce a píxeles en cuanto se mide el lienzo.
  // No depende de x/y para que arrastrar no pelee con el estado del padre.
  useEffect(() => {
    if (!stage.width || !stage.height) return;
    offsetX.value = ((x - 50) / 100) * stage.width;
    offsetY.value = ((y - 50) / 100) * stage.height;
  }, [stage.width, stage.height]);

  const commit = (movedX: number, movedY: number) => {
    if (!stage.width || !stage.height) return;
    onMove(
      clampPercent(50 + (movedX / stage.width) * 100),
      clampPercent(50 + (movedY / stage.height) * 100)
    );
  };

  const drag = Gesture.Pan()
    // Un umbral pequeño deja que los toques lleguen al TextInput de la capa
    .activeOffsetX([-8, 8])
    .activeOffsetY([-8, 8])
    .onStart(() => {
      startX.value = offsetX.value;
      startY.value = offsetY.value;
      runOnJS(onSelect)();
    })
    .onUpdate((event) => {
      offsetX.value = startX.value + event.translationX;
      offsetY.value = startY.value + event.translationY;
    })
    .onEnd(() => {
      runOnJS(commit)(offsetX.value, offsetY.value);
    });

  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(onSelect)();
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetX.value }, { translateY: offsetY.value }],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={styles.center} pointerEvents="box-none">
        <GestureDetector gesture={selected ? drag : Gesture.Race(drag, tap)}>
          <Animated.View style={[styles.layer, style, selected && styles.selected, animatedStyle]}>
            {children}

            {selected && (
              <TouchableOpacity style={styles.removeBtn} onPress={onRemove} activeOpacity={0.8}>
                <X size={12} color={colors.neutral.white} />
              </TouchableOpacity>
            )}
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  layer: { padding: 6, borderRadius: radii.md, borderWidth: 1, borderColor: 'transparent' },
  selected: { borderStyle: 'dashed', borderColor: colors.brand.primary },
  removeBtn: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.neutral.gray800,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
