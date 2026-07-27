import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { colors } from '@beeapp/design-system';
import {
  Edit2,
  Trash2,
  Package,
  Wrench,
  Laptop,
  UtensilsCrossed,
  Scissors,
  Briefcase,
  PenTool,
  Sofa,
  Image as ImageIcon,
} from 'lucide-react-native';
import MyServicesHeader from '../../../src/components/my-services/MyServicesHeader';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import { getMyItems, updateItem, removeItem, formatPrice, MyProductService } from '../../../src/mocks/myServices';

const CATEGORY_MAP: Record<string, { icon: typeof Laptop; color: string; bg: string; name: string }> = {
  tecnologia: { icon: Laptop, color: '#1E88E5', bg: '#EBF5FF', name: 'Tecnología' },
  alimentos: { icon: UtensilsCrossed, color: '#D97706', bg: '#FEF3C7', name: 'Alimentos' },
  belleza: { icon: Scissors, color: '#DB2777', bg: '#FCE7F3', name: 'Belleza' },
  consultoria: { icon: Briefcase, color: '#7C3AED', bg: '#F3E8FF', name: 'Consultoría' },
  diseno: { icon: PenTool, color: '#0891B2', bg: '#CFFAFE', name: 'Diseño' },
  hogar: { icon: Sofa, color: '#059669', bg: '#ECFDF5', name: 'Hogar' },
};

export default function MyServicesDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [item, setItem] = useState<MyProductService | null>(null);

  const loadItem = () => {
    if (id) {
      const found = getMyItems().find((i) => i.id === id);
      setItem(found || null);
    }
  };

  useEffect(() => {
    loadItem();
    const unsubscribe = navigation.addListener('focus', () => {
      loadItem();
    });
    return unsubscribe;
  }, [id, navigation]);

  const handleToggleStatus = (newActive: boolean) => {
    if (!item) return;
    const newStatus = newActive ? 'active' : 'inactive';
    updateItem(item.id, { status: newStatus });
    setItem({ ...item, status: newStatus });
  };

  const handleEdit = () => {
    if (!item) return;
    router.push({
      pathname: '/(main)/my-services/edit',
      params: { id: item.id },
    });
  };

  const handleDelete = () => {
    if (!item) return;
    Alert.alert(
      'Eliminar oferta',
      '¿Estás seguro de que deseas eliminar permanentemente esta oferta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            removeItem(item.id);
            router.back();
          },
        },
      ]
    );
  };

  if (!item) {
    return (
      <ScreenSafeArea style={styles.safeArea}>
        <View style={styles.container}>
          <MyServicesHeader title="Detalle" />
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>No se pudo encontrar el producto o servicio.</Text>
          </View>
        </View>
        <FloatingTabBar />
      </ScreenSafeArea>
    );
  }

  const catInfo = CATEGORY_MAP[item.category] || {
    icon: item.type === 'product' ? Package : Wrench,
    color: colors.brand.primary,
    bg: '#F3E8FF',
    name: 'General',
  };

  const IconComponent = catInfo.icon;
  const isProduct = item.type === 'product';
  const priceText = isProduct && item.price !== null
    ? formatPrice(item.price)
    : 'Precio acordado por chat';

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <MyServicesHeader title="Detalle de Oferta" />

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {/* Main Info Box */}
          <View style={styles.heroSection}>
            <View style={[styles.avatarWrap, { backgroundColor: catInfo.bg }]}>
              <IconComponent size={36} color={catInfo.color} />
            </View>
            <View style={styles.badgeRow}>
              <View style={[styles.pill, { backgroundColor: colors.brand.primary + '15' }]}>
                <Text style={[styles.pillText, { color: colors.brand.primary }]}>{catInfo.name}</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: colors.neutral.gray100 }]}>
                <Text style={[styles.pillText, { color: colors.neutral.gray600 }]}>
                  {isProduct ? 'Producto' : 'Servicio'}
                </Text>
              </View>
            </View>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.price}>{priceText}</Text>
          </View>

          {/* Description */}
          {item.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Descripción</Text>
              <Text style={styles.descText}>{item.description}</Text>
            </View>
          ) : null}

          {/* Variants (Product Only) */}
          {isProduct && item.variants && item.variants.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Variantes disponibles</Text>
              {item.variants.map((v, index) => (
                <View key={index} style={styles.variantRow}>
                  <Text style={styles.variantName}>{v.name}:</Text>
                  <Text style={styles.variantValue}>{v.value}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Image Placeholder View */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Imagen de galería</Text>
            <View style={styles.photoContainer}>
              <ImageIcon size={32} color={colors.neutral.gray400} />
              <Text style={styles.photoText}>
                {item.image ? 'Imagen guardada correctamente' : 'Sin imagen cargada'}
              </Text>
            </View>
          </View>

          {/* Status Switcher Row */}
          <View style={styles.statusBox}>
            <View>
              <Text style={styles.statusBoxTitle}>Publicación activa</Text>
              <Text style={styles.statusBoxSub}>
                {item.status === 'active' ? 'Tus clientes pueden ver esta oferta' : 'Oferta oculta para tus clientes'}
              </Text>
            </View>
            <Switch
              value={item.status === 'active'}
              onValueChange={handleToggleStatus}
              trackColor={{ false: colors.neutral.gray300, true: colors.brand.primary + '80' }}
              thumbColor={item.status === 'active' ? colors.brand.primary : colors.neutral.gray400}
            />
          </View>

          {/* Action Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.btn, styles.btnDelete]} onPress={handleDelete} activeOpacity={0.7}>
              <Trash2 size={18} color={colors.semantic.error} style={{ marginRight: 6 }} />
              <Text style={styles.btnTextDelete}>Eliminar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnEdit]} onPress={handleEdit} activeOpacity={0.7}>
              <Edit2 size={18} color={colors.neutral.white} style={{ marginRight: 6 }} />
              <Text style={styles.btnTextEdit}>Editar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        <View style={styles.spacer} />
      </View>
      <FloatingTabBar />
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.neutral.white },
  container: { flex: 1, backgroundColor: colors.neutral.white },
  scroll: { flex: 1 },
  content: { padding: 16 },
  errorBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 14, color: colors.semantic.error, textAlign: 'center' },
  heroSection: { alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.neutral.gray100, marginBottom: 16 },
  avatarWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  badgeRow: { flexDirection: 'row', marginBottom: 8 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginRight: 8 },
  pillText: { fontSize: 11, fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '800', color: colors.neutral.text, textAlign: 'center', marginBottom: 6, paddingHorizontal: 8 },
  price: { fontSize: 18, fontWeight: '700', color: colors.brand.primary },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.neutral.text, marginBottom: 8 },
  descText: { fontSize: 14, color: colors.neutral.gray700, lineHeight: 20 },
  variantRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.neutral.gray100 },
  variantName: { fontSize: 13, fontWeight: '600', color: colors.neutral.gray600, width: 90 },
  variantValue: { fontSize: 13, color: colors.neutral.text, flex: 1 },
  photoContainer: { height: 100, borderRadius: 8, borderWidth: 1, borderColor: colors.neutral.gray200, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' },
  photoText: { fontSize: 12, color: colors.neutral.gray500, marginTop: 8 },
  statusBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 8, padding: 12, marginBottom: 24, borderWidth: 1, borderColor: colors.neutral.gray100 },
  statusBoxTitle: { fontSize: 13, fontWeight: '700', color: colors.neutral.text },
  statusBoxSub: { fontSize: 11, color: colors.neutral.gray500, marginTop: 2 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  btn: { flex: 1, height: 46, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnDelete: { backgroundColor: colors.neutral.white, borderWidth: 1, borderColor: colors.semantic.error, marginRight: 12 },
  btnEdit: { backgroundColor: colors.brand.primary },
  btnTextDelete: { fontSize: 14, fontWeight: '600', color: colors.semantic.error },
  btnTextEdit: { fontSize: 14, fontWeight: '700', color: colors.neutral.white },
  spacer: { height: 80 },
});
