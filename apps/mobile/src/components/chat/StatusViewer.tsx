import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, Image, TouchableOpacity, Animated, Easing } from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors, spacing, radii } from '@beeapp/design-system';
import { X, ShoppingBag } from 'lucide-react-native';
import ScreenSafeArea from '../layout/ScreenSafeArea';
import StatusProgressPills from './StatusProgressPills';
import { StatusItem } from '../../mocks/statuses';
import { formatPrice } from '../../mocks/myServices';

/** How long a status stays on screen before moving to the next one */
const STATUS_DURATION = 6000;

interface StatusViewerProps {
  visible: boolean;
  statuses: StatusItem[];
  index: number;
  onChangeIndex: (index: number) => void;
  onClose: () => void;
}

/**
 * Full screen status: the photo floats as a rounded card over a blurred copy
 * of itself, the author text sits where its author dropped it, and the linked
 * product hangs at the bottom as its own card.
 */
export default function StatusViewer({ visible, statuses, index, onChangeIndex, onClose }: StatusViewerProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const [productHidden, setProductHidden] = useState(false);
  const status = statuses[index];

  const goNext = () => (index < statuses.length - 1 ? onChangeIndex(index + 1) : onClose());
  const goPrev = () => index > 0 && onChangeIndex(index - 1);

  // Each status restarts the bar; when it fills up the next one opens
  useEffect(() => {
    if (!visible || !status) return;
    setProductHidden(false);
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: STATUS_DURATION,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animation.start(({ finished }) => finished && goNext());
    return () => animation.stop();
  }, [visible, index, status?.id]);

  if (!status) return null;

  const isPhoto = status.type === 'photo';
  const background = status.bgColor ?? colors.neutral.text;
  const onDark = isPhoto || background !== colors.neutral.white;
  const product = status.linkedProduct;

  // Swiping down anywhere closes the viewer
  const dismissGesture = Gesture.Pan().onEnd((event) => {
    if (event.translationY > 120) onClose();
  });

  // The product card can be pushed away on its own
  const hideProductGesture = Gesture.Pan().onEnd((event) => {
    if (event.translationY > 40) setProductHidden(true);
  });

  const textStyle = {
    fontSize: status.textSize,
    fontWeight: status.textWeight,
    color: status.textColor,
    lineHeight: status.textSize * 1.3,
  } as const;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={styles.root}>
        <GestureDetector gesture={dismissGesture}>
          <View style={[styles.screen, { backgroundColor: background }]}>
            {isPhoto ? (
              <>
                {/* The same photo, blurred, is the backdrop of the sharp one */}
                <Image
                  source={{ uri: status.photoUrl ?? undefined }}
                  style={styles.blurLayer}
                  resizeMode="cover"
                  blurRadius={30}
                />
                <View style={styles.blurTint} />
              </>
            ) : (
              <View style={styles.softShade} />
            )}

            {/* Tap zones: left goes back, right advances */}
            <TouchableOpacity style={styles.tapLeft} onPress={goPrev} activeOpacity={1} />
            <TouchableOpacity style={styles.tapRight} onPress={goNext} activeOpacity={1} />

            <ScreenSafeArea style={styles.overlay} pointerEvents="box-none">
              <View style={styles.topRow}>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                  <X size={22} color={onDark ? colors.neutral.white : colors.neutral.text} />
                </TouchableOpacity>

                <View style={[styles.avatar, { backgroundColor: status.authorColor }]}>
                  <Text style={styles.avatarText}>{status.authorInitials}</Text>
                </View>

                <View style={styles.authorTexts}>
                  <Text style={[styles.authorName, onDark && styles.onDarkText]} numberOfLines={1}>
                    {status.authorName}
                  </Text>
                  <Text style={[styles.timestamp, onDark && styles.onDarkMuted]}>{status.timestamp}</Text>
                </View>
              </View>

              <StatusProgressPills
                count={statuses.length}
                index={index}
                progress={progress}
                onDark={onDark}
              />

              <View style={styles.stage} pointerEvents="none">
                {isPhoto && (
                  <Image
                    source={{ uri: status.photoUrl ?? undefined }}
                    style={styles.photoCard}
                    resizeMode="cover"
                  />
                )}

                {/* Text sits exactly where the author dropped it */}
                <View
                  style={[
                    styles.textLayer,
                    { top: `${status.textPosition.y}%`, left: `${status.textPosition.x}%` },
                  ]}
                >
                  <Text style={[styles.statusText, textStyle]}>{status.text}</Text>
                </View>
              </View>

              {!!product && !productHidden && (
                <GestureDetector gesture={hideProductGesture}>
                  <View style={styles.productCard}>
                    <View style={styles.productThumb}>
                      <ShoppingBag size={20} color={colors.brand.primary} />
                    </View>
                    <View style={styles.productTexts}>
                      <Text style={styles.productName} numberOfLines={1}>
                        {product.name}
                      </Text>
                      <Text style={styles.productPrice}>
                        {product.price !== null ? formatPrice(product.price) : 'Cotización'}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.contactBtn} onPress={() => {}} activeOpacity={0.8}>
                      <Text style={styles.contactBtnText}>Contactar</Text>
                    </TouchableOpacity>
                  </View>
                </GestureDetector>
              )}
            </ScreenSafeArea>
          </View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screen: { flex: 1 },
  blurLayer: StyleSheet.absoluteFillObject,
  blurTint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.45)' },
  // Subtle shade so a flat background still has depth
  softShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.08)' },
  tapLeft: { position: 'absolute', top: 0, bottom: 0, left: 0, width: '35%' },
  tapRight: { position: 'absolute', top: 0, bottom: 0, right: 0, width: '35%' },
  overlay: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  closeBtn: { padding: 6 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '600', color: colors.brand.primary },
  authorTexts: { flex: 1 },
  authorName: { fontSize: 14, fontWeight: '400', color: colors.neutral.text },
  timestamp: { fontSize: 12, fontWeight: '400', color: colors.neutral.gray600 },
  onDarkText: { color: colors.neutral.white },
  onDarkMuted: { color: colors.neutral.white, opacity: 0.75 },
  stage: { flex: 1, margin: spacing.lg },
  // The sharp photo floats above the blurred backdrop
  photoCard: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    shadowColor: colors.neutral.text,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  textLayer: {
    position: 'absolute',
    width: '86%',
    marginLeft: '-43%',
    transform: [{ translateY: -20 }],
  },
  statusText: { textAlign: 'center' },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.neutral.white,
    borderRadius: radii.xl,
    padding: 12,
    shadowColor: colors.neutral.text,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  productThumb: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: `${colors.brand.primary}1A`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productTexts: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '400', color: colors.neutral.text },
  productPrice: { fontSize: 13, fontWeight: '400', color: colors.neutral.gray600, marginTop: 2 },
  contactBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  contactBtnText: { fontSize: 13, fontWeight: '600', color: colors.neutral.white },
});
