import { ReactNode, useEffect } from 'react';
import {
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  TouchableOpacity,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { colors, radii } from '@beeapp/design-system';

interface DraggableLayerProps {
  x: number;
  y: number;
  scale?: number;
  rotation?: number;
  stage: {
    width: number;
    height: number;
  };
  selected: boolean;
  editable?: boolean;
  onSelect: () => void;
  onDoubleTap?: () => void;
  onMove: (x: number, y: number) => void;
  onTransform?: (
    scale: number,
    rotation: number,
  ) => void;
  onRemove: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const clampPercent = (value: number) => (
  Math.min(95, Math.max(5, value))
);

const clampScale = (value: number) => (
  Math.min(3, Math.max(0.35, value))
);

export default function DraggableLayer({
  x,
  y,
  scale = 1,
  rotation = 0,
  stage,
  selected,
  editable = false,
  onSelect,
  onDoubleTap,
  onMove,
  onTransform,
  onRemove,
  children,
  style,
}: DraggableLayerProps) {
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const scaleValue = useSharedValue(scale);
  const startScale = useSharedValue(scale);

  const rotationValue = useSharedValue(rotation);
  const startRotation = useSharedValue(rotation);

  useEffect(() => {
    if (!stage.width || !stage.height) {
      return;
    }

    offsetX.value = ((x - 50) / 100) * stage.width;
    offsetY.value = ((y - 50) / 100) * stage.height;
  }, [
    stage.height,
    stage.width,
    x,
    y,
  ]);

  useEffect(() => {
    scaleValue.value = scale;
    rotationValue.value = rotation;
  }, [
    rotation,
    scale,
  ]);

  const commitPosition = (
    movedX: number,
    movedY: number,
  ) => {
    if (!stage.width || !stage.height) {
      return;
    }

    onMove(
      clampPercent(
        50 + (movedX / stage.width) * 100,
      ),
      clampPercent(
        50 + (movedY / stage.height) * 100,
      ),
    );
  };

  const commitTransform = (
    nextScale: number,
    nextRotation: number,
  ) => {
    onTransform?.(
      clampScale(nextScale),
      nextRotation,
    );
  };

  const pan = Gesture.Pan()
    .enabled(!editable)
    .minPointers(1)
    .maxPointers(1)
    .minDistance(2)
    .onBegin(() => {
      startX.value = offsetX.value;
      startY.value = offsetY.value;
      runOnJS(onSelect)();
    })
    .onUpdate((event) => {
      offsetX.value = startX.value + event.translationX;
      offsetY.value = startY.value + event.translationY;
    })
    .onEnd(() => {
      runOnJS(commitPosition)(
        offsetX.value,
        offsetY.value,
      );
    });

  const pinch = Gesture.Pinch()
    .enabled(!editable)
    .onBegin(() => {
      startScale.value = scaleValue.value;
      runOnJS(onSelect)();
    })
    .onUpdate((event) => {
      scaleValue.value = Math.min(
        3,
        Math.max(
          0.35,
          startScale.value * event.scale,
        ),
      );
    })
    .onEnd(() => {
      runOnJS(commitTransform)(
        scaleValue.value,
        rotationValue.value,
      );
    });

  const rotate = Gesture.Rotation()
    .enabled(!editable)
    .onBegin(() => {
      startRotation.value = rotationValue.value;
      runOnJS(onSelect)();
    })
    .onUpdate((event) => {
      rotationValue.value = (
        startRotation.value
        + (event.rotation * 180) / Math.PI
      );
    })
    .onEnd(() => {
      runOnJS(commitTransform)(
        scaleValue.value,
        rotationValue.value,
      );
    });

  const singleTap = Gesture.Tap()
    .enabled(!editable)
    .maxDuration(220)
    .onEnd(() => {
      runOnJS(onSelect)();
    });

  const doubleTap = Gesture.Tap()
    .enabled(!editable)
    .numberOfTaps(2)
    .maxDelay(250)
    .onEnd(() => {
      if (onDoubleTap) {
        runOnJS(onDoubleTap)();
      }
    });

  const transform = Gesture.Simultaneous(
    pinch,
    rotate,
  );

  const taps = Gesture.Exclusive(
    doubleTap,
    singleTap,
  );

  const gesture = Gesture.Simultaneous(
    pan,
    transform,
    taps,
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: offsetX.value,
      },
      {
        translateY: offsetY.value,
      },
      {
        rotate: `${rotationValue.value}deg`,
      },
      {
        scale: scaleValue.value,
      },
    ],
  }));

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none"
    >
      <View
        style={styles.center}
        pointerEvents="box-none"
      >
        <GestureDetector gesture={gesture}>
          <Animated.View
            style={[
              styles.touchZone,
              selected
                ? styles.touchZoneSelected
                : styles.touchZoneIdle,
              animatedStyle,
            ]}
          >
            <View
              style={[
                styles.layer,
                style,
                selected && styles.selected,
              ]}
            >
              {children}

              {selected ? (
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={onRemove}
                  activeOpacity={0.8}
                >
                  <X
                    size={12}
                    color={colors.neutral.white}
                  />
                </TouchableOpacity>
              ) : null}
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  touchZone: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  touchZoneIdle: {
    padding: 6,
  },
  touchZoneSelected: {
    minHeight: 300,
    minWidth: 300,
    padding: 110,
  },
  layer: {
    borderColor: 'transparent',
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 6,
  },
  selected: {
    borderColor: colors.brand.primary,
    borderStyle: 'dashed',
  },
  removeBtn: {
    alignItems: 'center',
    backgroundColor: colors.neutral.gray800,
    borderRadius: 11,
    height: 22,
    justifyContent: 'center',
    position: 'absolute',
    right: -10,
    top: -10,
    width: 22,
  },
});
