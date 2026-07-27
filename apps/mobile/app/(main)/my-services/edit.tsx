import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@beeapp/design-system';
import MyServicesHeader from '../../../src/components/my-services/MyServicesHeader';
import MyServiceForm from '../../../src/components/my-services/MyServiceForm';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import { getMyItems, updateItem, MyProductService } from '../../../src/mocks/myServices';

export default function MyServicesEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const currentItem = getMyItems().find((i) => i.id === id);

  const handleSave = (itemData: Omit<MyProductService, 'id' | 'createdAt'>) => {
    if (id) {
      updateItem(id, itemData);
    }
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  if (!currentItem) {
    return (
      <ScreenSafeArea style={styles.safeArea}>
        <View style={styles.container}>
          <MyServicesHeader title="Editar Oferta" />
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>No se pudo encontrar el producto o servicio especificado.</Text>
          </View>
        </View>
        <FloatingTabBar />
      </ScreenSafeArea>
    );
  }

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <MyServicesHeader title="Editar Oferta" />
        <MyServiceForm initialData={currentItem} onSave={handleSave} onCancel={handleCancel} />
        <View style={styles.spacer} />
      </View>
      <FloatingTabBar />
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.neutral.white },
  container: { flex: 1, backgroundColor: colors.neutral.white },
  errorBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 14, color: colors.semantic.error, textAlign: 'center' },
  spacer: { height: 80 },
});
