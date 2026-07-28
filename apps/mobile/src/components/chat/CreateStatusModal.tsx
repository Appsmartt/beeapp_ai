import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Image, TextInput, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { colors, spacing, radii } from '@beeapp/design-system';
import { X, ImageIcon } from 'lucide-react-native';
import ScreenSafeArea from '../layout/ScreenSafeArea';
import StatusEditorToolbar from './StatusEditorToolbar';
import ProductLinkSelector from './ProductLinkSelector';
import { StatusItem, StatusProductLink, STATUS_BG_COLORS, STATUS_TEXT_COLORS } from '../../mocks/statuses';
import { CURRENT_USER } from '../../mocks/currentUser';

const MOCK_PHOTO = 'https://picsum.photos/id/1069/600/800';

interface CreateStatusModalProps {
  visible: boolean;
  onPublish: (status: Omit<StatusItem, 'id' | 'timestamp' | 'viewed'>) => void;
  onClose: () => void;
}

/** Full screen status editor: live preview, draggable text and its controls */
export default function CreateStatusModal({ visible, onPublish, onClose }: CreateStatusModalProps) {
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState(STATUS_BG_COLORS[0]);
  const [textColor, setTextColor] = useState(STATUS_TEXT_COLORS[0]);
  const [textSize, setTextSize] = useState(24);
  const [bold, setBold] = useState(false);
  const [product, setProduct] = useState<StatusProductLink | null>(null);
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [stage, setStage] = useState({ width: 0, height: 0 });

  // Offset of the text from the centre of the preview, in pixels
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  // Every time the editor opens it starts from a blank status
  useEffect(() => {
    if (!visible) return;
    setText('');
    setPhoto(null);
    setBgColor(STATUS_BG_COLORS[0]);
    setTextColor(STATUS_TEXT_COLORS[0]);
    setTextSize(24);
    setBold(false);
    setProduct(null);
    offsetX.value = 0;
    offsetY.value = 0;
  }, [visible]);

  const dragText = Gesture.Pan()
    .onStart(() => {
      startX.value = offsetX.value;
      startY.value = offsetY.value;
    })
    .onUpdate((event) => {
      offsetX.value = startX.value + event.translationX;
      offsetY.value = startY.value + event.translationY;
    });

  const textAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetX.value }, { translateY: offsetY.value }],
  }));

  const onStageLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setStage({ width, height });
  };

  /** The drag offset becomes a percentage so any screen renders it the same */
  const toPercent = (offset: number, size: number) =>
    Math.min(95, Math.max(5, 50 + (size > 0 ? (offset / size) * 100 : 0)));

  const handlePublish = () =>
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
      textPosition: {
        x: toPercent(offsetX.value, stage.width),
        y: toPercent(offsetY.value, stage.height),
      },
      textSize,
      textWeight: bold ? '700' : '400',
      textColor,
    });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={styles.root}>
        <ScreenSafeArea style={styles.screen}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={onClose} style={styles.iconBtn} activeOpacity={0.7}>
              <X size={22} color={colors.neutral.text} />
            </TouchableOpacity>
            <Text style={styles.topTitle}>Crear estado</Text>
            <TouchableOpacity
              style={[styles.publishBtn, !text.trim() && styles.publishBtnDisabled]}
              disabled={!text.trim()}
              onPress={handlePublish}
              activeOpacity={0.8}
            >
              <Text style={styles.publishBtnText}>Publicar</Text>
            </TouchableOpacity>
          </View>

          {/* Live preview: exactly what the status will look like */}
          <View
            style={[styles.preview, !photo && { backgroundColor: bgColor }]}
            onLayout={onStageLayout}
          >
            {photo ? (
              <>
                <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.removePhotoBtn}
                  onPress={() => setPhoto(null)}
                  activeOpacity={0.8}
                >
                  <X size={16} color={colors.neutral.white} />
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.emptyHint} pointerEvents="none">
                <ImageIcon size={22} color={colors.neutral.gray400} />
              </View>
            )}

            <GestureDetector gesture={dragText}>
              <Animated.View style={[styles.textLayer, textAnimatedStyle]}>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      fontSize: textSize,
                      fontWeight: bold ? '700' : '400',
                      color: textColor,
                      lineHeight: textSize * 1.3,
                    },
                  ]}
                  value={text}
                  onChangeText={setText}
                  placeholder="Escribe tu estado..."
                  placeholderTextColor={`${textColor}99`}
                  multiline
                  textAlign="center"
                />
              </Animated.View>
            </GestureDetector>
          </View>

          <StatusEditorToolbar
            textSize={textSize}
            onChangeSize={setTextSize}
            bold={bold}
            onToggleBold={() => setBold((b) => !b)}
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
        </ScreenSafeArea>

        <ProductLinkSelector
          visible={selectorVisible}
          selectedId={product?.id}
          onLink={(linked) => {
            setProduct(linked);
            setSelectorVisible(false);
          }}
          onClose={() => setSelectorVisible(false)}
        />
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.neutral.white },
  screen: { flex: 1, backgroundColor: colors.neutral.white },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  iconBtn: { padding: 6 },
  topTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.neutral.text },
  publishBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: radii.lg,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  publishBtnDisabled: { backgroundColor: colors.neutral.gray400 },
  publishBtnText: { fontSize: 14, fontWeight: '600', color: colors.neutral.white },
  preview: {
    flex: 1,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: StyleSheet.absoluteFillObject,
  emptyHint: { position: 'absolute', top: 16, right: 16, opacity: 0.8 },
  removePhotoBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textLayer: { width: '84%' },
  textInput: { textAlign: 'center', padding: 0 },
});
