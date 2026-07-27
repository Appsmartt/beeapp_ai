import React, { useState, useEffect } from 'react';
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
import { Plus, Package } from 'lucide-react-native';
import MyServicesHeader from '../../../src/components/my-services/MyServicesHeader';
import MyServiceItem from '../../../src/components/my-services/MyServiceItem';
import MyServicesFilterChips, { MyServicesFilter } from '../../../src/components/my-services/MyServicesFilterChips';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import { getMyItems, MyProductService } from '../../../src/mocks/myServices';

const EMPTY_TITLE: Record<MyServicesFilter, string> = {
  all: 'No hay elementos aún',
  product: 'No hay productos aún',
  service: 'No hay servicios aún',
};

export default function MyServicesIndexScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [items, setItems] = useState<MyProductService[]>([]);
  const [filter, setFilter] = useState<MyServicesFilter>('all');

  const reloadItems = () => {
    setItems(getMyItems());
  };

  useEffect(() => {
    reloadItems();
    const unsubscribe = navigation.addListener('focus', () => {
      reloadItems();
    });
    return unsubscribe;
  }, [navigation]);

  const handleCreate = () => {
    router.push('/(main)/my-services/create');
  };

  const handleSelectItem = (item: MyProductService) => {
    router.push({
      pathname: '/(main)/my-services/detail',
      params: { id: item.id },
    });
  };

  const visibleItems = filter === 'all' ? items : items.filter((item) => item.type === filter);

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <MyServicesHeader title="BeeServices" />

        <MyServicesFilterChips activeFilter={filter} onChange={setFilter} />

        <FlatList
          data={visibleItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MyServiceItem item={item} onPress={() => handleSelectItem(item)} />
          )}
          contentContainerStyle={[
            styles.listContent,
            visibleItems.length === 0 && styles.emptyListContent,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Package size={48} color={colors.neutral.gray400} />
              </View>
              <Text style={styles.emptyTitle}>{EMPTY_TITLE[filter]}</Text>
              <Text style={styles.emptyDesc}>
                Publica lo que ofreces para que tu red pueda encontrarlo.
              </Text>
              <TouchableOpacity style={styles.createBtn} onPress={handleCreate} activeOpacity={0.8}>
                <Plus size={18} color={colors.neutral.white} style={{ marginRight: 6 }} />
                <Text style={styles.createBtnText}>Crear nuevo</Text>
              </TouchableOpacity>
            </View>
          }
        />

        {/* Floating Action Button */}
        <TouchableOpacity style={styles.fab} onPress={handleCreate} activeOpacity={0.8}>
          <Plus size={24} color={colors.neutral.white} />
        </TouchableOpacity>
      </View>
      <FloatingTabBar />
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.neutral.white },
  container: { flex: 1, backgroundColor: colors.neutral.white },
  listContent: { paddingBottom: 180 },
  emptyListContent: { flexGrow: 1, justifyContent: 'center' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.neutral.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: parseInt(typography.fontSize.subtitle, 10),
    fontWeight: '700',
    color: colors.neutral.text,
    marginBottom: spacing.sm,
  },
  emptyDesc: {
    fontSize: parseInt(typography.fontSize.body, 10),
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
    fontSize: parseInt(typography.fontSize.body, 10),
    fontWeight: '700',
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
