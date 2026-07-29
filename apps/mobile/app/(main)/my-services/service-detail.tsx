import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { colors } from '@beeapp/design-system';
import MyServicesHeader from '../../../src/components/my-services/MyServicesHeader';
import ServiceDetailScreen from '../../../src/components/my-services/ServiceDetailScreen';
import CreateServiceModal, {
  ServiceFormData,
} from '../../../src/components/my-services/CreateServiceModal';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import {
  getBusinessById,
  updateBusiness,
  Business,
  BusinessService,
} from '../../../src/mocks/myServices';

export default function ServiceDetailRoute() {
  const router = useRouter();
  const navigation = useNavigation();
  const { businessId, serviceId } = useLocalSearchParams<{ businessId: string; serviceId: string }>();

  const [business, setBusiness] = useState<Business | null>(null);
  const [service, setService] = useState<BusinessService | null>(null);
  const [editVisible, setEditVisible] = useState(false);

  const reload = useCallback(() => {
    if (businessId && serviceId) {
      const biz = getBusinessById(businessId);
      if (biz) {
        setBusiness(biz);
        const srv = biz.services.find((s) => s.id === serviceId);
        if (srv) {
          setService({ ...srv });
        }
      }
    }
  }, [businessId, serviceId]);

  useEffect(() => {
    reload();
    const unsubscribe = navigation.addListener('focus', reload);
    return unsubscribe;
  }, [navigation, reload]);

  if (!business || !service) {
    return (
      <ScreenSafeArea style={styles.safeArea}>
        <MyServicesHeader title="Servicio no encontrado" />
        <View style={styles.errorBody} />
        <FloatingTabBar />
      </ScreenSafeArea>
    );
  }

  const handleEditSave = (data: ServiceFormData) => {
    const updatedServices = business.services.map((s) =>
      s.id === service.id ? { ...s, ...data } : s,
    );
    updateBusiness(business.id, { services: updatedServices });
    setEditVisible(false);
    reload();
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar servicio',
      '¿Estás seguro de que deseas eliminar este servicio del catálogo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            const updatedServices = business.services.filter((s) => s.id !== service.id);
            updateBusiness(business.id, { services: updatedServices });
            router.back();
          },
        },
      ],
    );
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <MyServicesHeader title={service.name} />
        <ServiceDetailScreen
          service={service}
          onEdit={() => setEditVisible(true)}
          onDelete={handleDelete}
        />
      </View>
      <FloatingTabBar />

      <CreateServiceModal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        onSave={handleEditSave}
        allowedServiceModes={business.serviceModes}
        initialData={service}
      />
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.neutral.white },
  container: { flex: 1, backgroundColor: colors.neutral.white },
  errorBody: { flex: 1, backgroundColor: colors.neutral.white },
});
