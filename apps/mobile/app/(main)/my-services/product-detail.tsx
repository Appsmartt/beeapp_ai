import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { colors } from '@beeapp/design-system';
import MyServicesHeader from '../../../src/components/my-services/MyServicesHeader';
import ProductDetailScreen from '../../../src/components/my-services/ProductDetailScreen';
import CreateProductModal, {
  ProductFormData,
} from '../../../src/components/my-services/CreateProductModal';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import {
  getBusinessById,
  updateBusiness,
  Business,
  BusinessProduct,
} from '../../../src/mocks/myServices';

export default function ProductDetailRoute() {
  const router = useRouter();
  const navigation = useNavigation();
  const { businessId, productId } = useLocalSearchParams<{ businessId: string; productId: string }>();

  const [business, setBusiness] = useState<Business | null>(null);
  const [product, setProduct] = useState<BusinessProduct | null>(null);
  const [editVisible, setEditVisible] = useState(false);

  const reload = useCallback(() => {
    if (businessId && productId) {
      const biz = getBusinessById(businessId);
      if (biz) {
        setBusiness(biz);
        const prod = biz.products.find((p) => p.id === productId);
        if (prod) {
          setProduct({ ...prod });
        }
      }
    }
  }, [businessId, productId]);

  useEffect(() => {
    reload();
    const unsubscribe = navigation.addListener('focus', reload);
    return unsubscribe;
  }, [navigation, reload]);

  if (!business || !product) {
    return (
      <ScreenSafeArea style={styles.safeArea}>
        <MyServicesHeader title="Producto no encontrado" />
        <View style={styles.errorBody} />
        <FloatingTabBar />
      </ScreenSafeArea>
    );
  }

  const handleEditSave = (data: ProductFormData) => {
    const updatedProducts = business.products.map((p) =>
      p.id === product.id ? { ...p, ...data } : p,
    );
    updateBusiness(business.id, { products: updatedProducts });
    setEditVisible(false);
    reload();
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar producto',
      '¿Estás seguro de que deseas eliminar este producto del catálogo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            const updatedProducts = business.products.filter((p) => p.id !== product.id);
            updateBusiness(business.id, { products: updatedProducts });
            router.back();
          },
        },
      ],
    );
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <MyServicesHeader title={product.name} />
        <ProductDetailScreen
          product={product}
          onEdit={() => setEditVisible(true)}
          onDelete={handleDelete}
        />
      </View>
      <FloatingTabBar />

      <CreateProductModal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        onSave={handleEditSave}
        allowedDeliveryMethods={business.deliveryMethods}
        initialData={product}
      />
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.neutral.white },
  container: { flex: 1, backgroundColor: colors.neutral.white },
  errorBody: { flex: 1, backgroundColor: colors.neutral.white },
});
