import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useRouter, useNavigation } from 'expo-router';
import { colors, spacing, typography } from '@beeapp/design-system';
import { Plus, Store } from 'lucide-react-native';
import MyServicesHeader from '../../../src/components/my-services/MyServicesHeader';
import BusinessListItem from '../../../src/components/my-services/BusinessListItem';
import CreateBusinessModal, {
  BusinessFormData,
} from '../../../src/components/my-services/CreateBusinessModal';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import { getBusinesses, addBusiness, Business } from '../../../src/mocks/myServices';

export default function MyServicesIndexScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  const reload = useCallback(() => {
    setBusinesses(getBusinesses());
  }, []);

  useEffect(() => {
    reload();
    const unsubscribe = navigation.addListener('focus', reload);
    return unsubscribe;
  }, [navigation, reload]);

  const handleCreate = (data: BusinessFormData) => {
    addBusiness(data);
    setModalVisible(false);
    reload();
  };

  const handleSelectBusiness = (business: Business) => {
    router.push({
      pathname: '/(main)/my-services/business-detail',
      params: { id: business.id },
    });
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <MyServicesHeader title="BeeServices" />

        <FlatList
          data={businesses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BusinessListItem
              business={item}
              onPress={() => handleSelectBusiness(item)}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            businesses.length === 0 && styles.emptyListContent,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Store size={48} color={colors.neutral.gray400} />
              </View>
              <Text style={styles.emptyTitle}>Aún no tienes negocios</Text>
              <Text style={styles.emptyDesc}>
                Crea tu primer negocio para empezar a ofrecer productos y servicios
              </Text>
              <TouchableOpacity
                style={styles.createBtn}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.8}
              >
                <Plus size={18} color={colors.neutral.white} style={{ marginRight: 6 }} />
                <Text style={styles.createBtnText}>Crear negocio</Text>
              </TouchableOpacity>
            </View>
          }
        />

        {/* FAB */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Plus size={24} color={colors.neutral.white} />
        </TouchableOpacity>
      </View>

      <FloatingTabBar />

      <CreateBusinessModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleCreate}
      />
    </ScreenSafeArea>
  );
}

const FONT = {
  subtitle: parseInt(typography.fontSize.subtitle, 10),
  body: parseInt(typography.fontSize.body, 10),
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.neutral.white },
  container: { flex: 1, backgroundColor: colors.neutral.white },
  listContent: { paddingBottom: 180 },
  emptyListContent: { flexGrow: 1, justifyContent: 'center' },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.neutral.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: FONT.subtitle,
    fontWeight: '400',
    color: colors.neutral.text,
    marginBottom: spacing.sm,
  },
  emptyDesc: {
    fontSize: FONT.body,
    fontWeight: '400',
    color: colors.neutral.gray500,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createBtnText: {
    color: colors.neutral.white,
    fontSize: FONT.body,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
});
