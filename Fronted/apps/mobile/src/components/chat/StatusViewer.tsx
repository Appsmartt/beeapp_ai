import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, Image, TouchableOpacity, Animated, Easing } from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors, spacing, radii } from '@beeapp/design-system';
import { X, ShoppingBag, Eye } from 'lucide-react-native';
import ScreenSafeArea from '../layout/ScreenSafeArea';
import StatusProgressPills from './StatusProgressPills';
import StatusViewersSheet from './StatusViewersSheet';
import { StatusItem } from '../../mocks/statuses';
import { formatPrice } from '../../mocks/myServices';

const STATUS_DURATION = 6000;

interface StatusViewerProps {
  visible: boolean;
  statuses: StatusItem[];
  index: number;
  onChangeIndex: (index: number) => void;
  onClose: () => void;
}

export default function StatusViewer({ visible, statuses, index, onChangeIndex, onClose }: StatusViewerProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const [productHidden, setProductHidden] = useState(false);
  const [viewersOpen, setViewersOpen] = useState(false);
  const status = statuses[index];

  const goNext = () => (index < statuses.length - 1 ? onChangeIndex(index + 1) : onClose());
  const goPrev = () => index > 0 && onChangeIndex(index - 1);

  // Lo avanzado del estado actual (0..1), para poder reanudar donde se pausó
  const elapsed = useRef(0);

  useEffect(() => {
    const id = progress.addListener(({ value }) => {
      elapsed.current = value;
    });
    return () => progress.removeListener(id);
  }, []);

  // Al cambiar de estado se vuelve a empezar
  useEffect(() => {
    if (!visible || !status) return;
    setProductHidden(false);
    setViewersOpen(false);
    elapsed.current = 0;
    progress.setValue(0);
  }, [visible, index, status?.id]);

  // La hoja de "Visto por" pausa el avance y lo reanuda con el tiempo restante
  useEffect(() => {
    if (!visible || !status || viewersOpen) return;
    const remaining = STATUS_DURATION * (1 - elapsed.current);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: Math.max(0, remaining),
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animation.start(({ finished }) => finished && goNext());
    return () => animation.stop();
  }, [visible, index, status?.id, viewersOpen]);

  if (!status) return null;

  const isPhoto = status.type === 'photo';
  const isOwnStatus = status.authorId === 'me' || !!status.viewedBy;
  const background = status.bgColor ?? colors.neutral.text;
  const onDark = isPhoto || background !== colors.neutral.white;
  const product = status.linkedProduct;

  const dismissGesture = Gesture.Pan().onEnd((event) => {
    if (event.translationY > 120) onClose();
  });

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
                <Image source={{ uri: status.photoUrl ?? undefined }} style={styles.blurLayer} resizeMode="cover" blurRadius={30} />
                <View style={styles.blurTint} />
              </>
            ) : (
              <View style={styles.softShade} />
            )}

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
                  <Text style={[styles.authorName, onDark && styles.onDarkText]} numberOfLines={1}>{status.authorName}</Text>
                  <Text style={[styles.timestamp, onDark && styles.onDarkMuted]}>{status.timestamp}</Text>
                </View>
              </View>

              <StatusProgressPills count={statuses.length} index={index} progress={progress} onDark={onDark} />

              <View style={styles.stage} pointerEvents="none">
                {isPhoto && <Image source={{ uri: status.photoUrl ?? undefined }} style={styles.photoCard} resizeMode="cover" />}
                <View style={[styles.textLayer, { top: `${status.textPosition.y}%`, left: `${status.textPosition.x}%` }]}>
                  <Text style={[styles.statusText, textStyle]}>{status.text}</Text>
                </View>
              </View>

              {isOwnStatus && (
                <TouchableOpacity style={styles.viewedByBar} onPress={() => setViewersOpen(true)} activeOpacity={0.8}>
                  <Eye size={16} color={colors.neutral.white} />
                  <Text style={styles.viewedByText}>Visto por {status.viewedBy?.length ?? 3}</Text>
                </TouchableOpacity>
              )}

              {!!product && !productHidden && (
                <GestureDetector gesture={hideProductGesture}>
                  <View style={styles.productCard}>
                    <View style={styles.productThumb}><ShoppingBag size={20} color={colors.brand.primary} /></View>
                    <View style={styles.productTexts}>
                      <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                      <Text style={styles.productPrice}>{product.price !== null ? formatPrice(product.price) : 'Cotización'}</Text>
                    </View>
                    <TouchableOpacity style={styles.contactBtn} onPress={() => {}} activeOpacity={0.8}><Text style={styles.contactBtnText}>Solicitar</Text></TouchableOpacity>
                  </View>
                </GestureDetector>
              )}
            </ScreenSafeArea>
          </View>
        </GestureDetector>

        <StatusViewersSheet visible={viewersOpen} viewedBy={status.viewedBy} onClose={() => setViewersOpen(false)} />
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screen: { flex: 1 },
  blurLayer: StyleSheet.absoluteFillObject,
  blurTint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.45)' },
  softShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.08)' },
  tapLeft: { position: 'absolute', top: 0, bottom: 0, left: 0, width: '35%' },
  tapRight: { position: 'absolute', top: 0, bottom: 0, right: 0, width: '35%' },
  overlay: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, paddingTop: spacing.sm },
  closeBtn: { padding: 6 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '600', color: colors.brand.primary },
  authorTexts: { flex: 1 },
  authorName: { fontSize: 14, fontWeight: '400', color: colors.neutral.text },
  timestamp: { fontSize: 12, fontWeight: '400', color: colors.neutral.gray600 },
  onDarkText: { color: colors.neutral.white },
  onDarkMuted: { color: colors.neutral.white, opacity: 0.75 },
  stage: { flex: 1, margin: spacing.lg },
  photoCard: { ...StyleSheet.absoluteFillObject, borderRadius: 20, elevation: 10 },
  textLayer: { position: 'absolute', width: '86%', marginLeft: '-43%', transform: [{ translateY: -20 }] },
  statusText: { textAlign: 'center' },
  viewedByBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.6)', marginHorizontal: 20, marginBottom: 12, borderRadius: 16 },
  viewedByText: { fontSize: 13, fontWeight: '600', color: colors.neutral.white },
  productCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: spacing.md, marginBottom: spacing.lg, backgroundColor: colors.neutral.white, borderRadius: radii.xl, padding: 12, elevation: 6 },
  productThumb: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: `${colors.brand.primary}1A`, alignItems: 'center', justifyContent: 'center' },
  productTexts: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '400', color: colors.neutral.text },
  productPrice: { fontSize: 13, fontWeight: '400', color: colors.neutral.gray600, marginTop: 2 },
  contactBtn: { backgroundColor: colors.brand.primary, borderRadius: radii.md, paddingHorizontal: 14, paddingVertical: 9 },
  contactBtnText: { fontSize: 13, fontWeight: '600', color: colors.neutral.white },
});
