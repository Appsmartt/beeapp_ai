import React from 'react';
import { View, StyleSheet } from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useRouter } from 'expo-router';
import { colors } from '@beeapp/design-system';
import MyServicesHeader from '../../../src/components/my-services/MyServicesHeader';
import MyServiceForm from '../../../src/components/my-services/MyServiceForm';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import { addItem, MyProductService } from '../../../src/mocks/myServices';

export default function MyServicesCreateScreen() {
  const router = useRouter();

  const handleSave = (itemData: Omit<MyProductService, 'id' | 'createdAt'>) => {
    addItem(itemData);
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <MyServicesHeader title="Nueva Oferta" />
        <MyServiceForm onSave={handleSave} onCancel={handleCancel} />
        <View style={styles.spacer} />
      </View>
      <FloatingTabBar />
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.neutral.white },
  container: { flex: 1, backgroundColor: colors.neutral.white },
  spacer: { height: 80 },
});
