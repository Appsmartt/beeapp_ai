import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { colors, spacing, typography, radii } from '@beeapp/design-system';
import { Plus, Package, Wrench, LayoutGrid, X } from 'lucide-react-native';
import MyServicesHeader from '../../../src/components/my-services/MyServicesHeader';
import BusinessHeader from '../../../src/components/my-services/BusinessHeader';
import CatalogItem from '../../../src/components/my-services/CatalogItem';
import CreateBusinessModal, {
  BusinessFormData,
} from '../../../src/components/my-services/CreateBusinessModal';
import CreateProductModal, {
  ProductFormData,
} from '../../../src/components/my-services/CreateProductModal';
import CreateServiceModal, {
  ServiceFormData,
} from '../../../src/components/my-services/CreateServiceModal';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import {
  getBusinessById,
  updateBusiness,
  removeBusiness,
  addProduct,
  addService,
  Business,
  BusinessProduct,
  BusinessService,
} from '../../../src/mocks/myServices';

type CatalogFilter = 'all' | 'product' | 'service';

export default function BusinessDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [business, setBusiness] = useState<Business | null>(null);

  // Filter state
  const [filter, setFilter] = useState<CatalogFilter>('all');

  // Modal visibilities
  const [editBizVisible, setEditBizVisible] = useState(false);
  const [createProdVisible, setCreateProdVisible] = useState(false);
  const [createSrvVisible, setCreateSrvVisible] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);

  const reload = useCallback(() => {
    if (id) {
      const biz = getBusinessById(id);
      if (biz) {
        setBusiness({ ...biz });
      }
    }
  }, [id]);

  useEffect(() => {
    reload();
    const unsubscribe = navigation.addListener('focus', reload);
    return unsubscribe;
  }, [navigation, reload]);

  if (!business) {
    return (
      <ScreenSafeArea style={styles.safeArea}>
        <MyServicesHeader title="Negocio no encontrado" />
        <View style={styles.errorBody}>
          <Text style={styles.errorText}>No se pudo cargar la información del negocio.</Text>
        </View>
        <FloatingTabBar />
      </ScreenSafeArea>
    );
  }

  const handleDeleteBusiness = () => {
    Alert.alert(
      'Eliminar negocio',
      '¿Estás seguro de que deseas eliminar este negocio y todo su catálogo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            removeBusiness(business.id);
            router.back();
          },
        },
      ],
    );
  };

  const handleUpdateBusiness = (data: BusinessFormData) => {
    updateBusiness(business.id, data);
    setEditBizVisible(false);
    reload();
  };

  const handleCreateProduct = (data: ProductFormData) => {
    addProduct(business.id, data);
    setCreateProdVisible(false);
    reload();
  };

  const handleCreateService = (data: ServiceFormData) => {
    addService(business.id, data);
    setCreateSrvVisible(false);
    reload();
  };

  const handleFabPress = () => {
    if (business.offersProducts && business.offersServices) {
      setShowPlusMenu(true);
    } else if (business.offersProducts) {
      setCreateProdVisible(true);
    } else if (business.offersServices) {
      setCreateSrvVisible(true);
    }
  };

  const handleSelectCatalogItem = (item: BusinessProduct | BusinessService, type: 'product' | 'service') => {
    if (type === 'product') {
      router.push({
        pathname: '/(main)/my-services/product-detail',
        params: { businessId: business.id, productId: item.id },
      });
    } else {
      router.push({
        pathname: '/(main)/my-services/service-detail',
        params: { businessId: business.id, serviceId: item.id },
      });
    }
  };

  // Filter products and services
  const items: { item: BusinessProduct | BusinessService; type: 'product' | 'service' }[] = [];
  if (filter === 'all' || filter === 'product') {
    business.products.forEach((p) => items.push({ item: p, type: 'product' }));
  }
  if (filter === 'all' || filter === 'service') {
    business.services.forEach((s) => items.push({ item: s, type: 'service' }));
  }

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <MyServicesHeader title={business.name} />

        <FlatList
          data={items}
          keyExtractor={(row) => `${row.type}_${row.item.id}`}
          renderItem={({ item }) => (
            <CatalogItem
              item={item.item}
              type={item.type}
              onPress={() => handleSelectCatalogItem(item.item, item.type)}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            items.length === 0 && styles.emptyListContent,
          ]}
          ListHeaderComponent={
            <View style={styles.headerComponent}>
              <BusinessHeader
                business={business}
                onEdit={() => setEditBizVisible(true)}
                onDelete={handleDeleteBusiness}
              />
              {/* Custom Catalog Filters */}
              <View style={styles.filterWrap}>
                <FilterChip
                  active={filter === 'all'}
                  label="Todos"
                  icon={LayoutGrid}
                  onPress={() => setFilter('all')}
                />
                {business.offersProducts && (
                  <FilterChip
                    active={filter === 'product'}
                    label="Productos"
                    icon={Package}
                    onPress={() => setFilter('product')}
                  />
                )}
                {business.offersServices && (
                  <FilterChip
                    active={filter === 'service'}
                    label="Servicios"
                    icon={Wrench}
                    onPress={() => setFilter('service')}
                  />
                )}
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Package size={44} color={colors.neutral.gray400} />
              </View>
              <Text style={styles.emptyTitle}>Tu catálogo está vacío</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={handleFabPress} activeOpacity={0.8}>
                <Plus size={16} color={colors.neutral.white} style={{ marginRight: 6 }} />
                <Text style={styles.emptyBtnText}>Agregar primer artículo</Text>
              </TouchableOpacity>
            </View>
          }
        />

        {/* FAB */}
        <TouchableOpacity style={styles.fab} onPress={handleFabPress} activeOpacity={0.8}>
          <Plus size={24} color={colors.neutral.white} />
        </TouchableOpacity>
      </View>

      <FloatingTabBar />

      {/* Modals */}
      <CreateBusinessModal
        visible={editBizVisible}
        onClose={() => setEditBizVisible(false)}
        onSave={handleUpdateBusiness}
        initialData={business}
      />

      <CreateProductModal
        visible={createProdVisible}
        onClose={() => setCreateProdVisible(false)}
        onSave={handleCreateProduct}
        allowedDeliveryMethods={business.deliveryMethods}
      />

      <CreateServiceModal
        visible={createSrvVisible}
        onClose={() => setCreateSrvVisible(false)}
        onSave={handleCreateService}
        allowedServiceModes={business.serviceModes}
      />

      {/* FAB Multi-choice Action Sheet Modal */}
      <Modal visible={showPlusMenu} transparent animationType="fade">
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setShowPlusMenu(false)}
        >
          <View style={styles.sheetContent}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Nuevo Artículo</Text>
              <TouchableOpacity onPress={() => setShowPlusMenu(false)}>
                <X size={20} color={colors.neutral.text} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.sheetRow}
              onPress={() => {
                setShowPlusMenu(false);
                setCreateProdVisible(true);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.sheetIconCircle, { backgroundColor: colors.brand.primary + '15' }]}>
                <Package size={18} color={colors.brand.primary} />
              </View>
              <Text style={styles.sheetText}>Nuevo producto</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetRow}
              onPress={() => {
                setShowPlusMenu(false);
                setCreateSrvVisible(true);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.sheetIconCircle, { backgroundColor: colors.neutral.gray100 }]}>
                <Wrench size={18} color={colors.neutral.gray700} />
              </View>
              <Text style={styles.sheetText}>Nuevo servicio</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScreenSafeArea>
  );
}

// ─── Inline sub-components ───────────────────────────────────────────────────

function FilterChip({
  active,
  label,
  icon: Icon,
  onPress,
}: {
  active: boolean;
  label: string;
  icon: typeof LayoutGrid;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Icon size={12} color={active ? colors.brand.primary : colors.neutral.gray600} />
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const FONT = {
  subtitle: parseInt(typography.fontSize.subtitle, 10),
  body: parseInt(typography.fontSize.body, 10),
  caption: parseInt(typography.fontSize.caption, 10),
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.neutral.white },
  container: { flex: 1, backgroundColor: colors.neutral.white },
  errorBody: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { fontSize: FONT.body, color: colors.neutral.gray500, textAlign: 'center' },
  listContent: { paddingBottom: 180 },
  emptyListContent: { flexGrow: 1 },
  headerComponent: { backgroundColor: colors.neutral.white },

  // Filters row
  filterWrap: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.lg,
    backgroundColor: colors.neutral.gray50,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  chipActive: {
    backgroundColor: colors.brand.primary + '10',
    borderColor: colors.brand.primary,
  },
  chipText: { fontSize: FONT.caption, fontWeight: '400', color: colors.neutral.gray700 },
  chipTextActive: { color: colors.brand.primary, fontWeight: '600' },

  // Empty container
  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 32, marginTop: 40 },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.neutral.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: FONT.body,
    fontWeight: '400',
    color: colors.neutral.gray500,
    marginBottom: 16,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyBtnText: { fontSize: 13, fontWeight: '600', color: colors.neutral.white },

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

  // Modal Action Sheet (mini-menu)
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.md,
    paddingBottom: 40,
    paddingTop: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 16, fontWeight: '600', color: colors.neutral.text },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  sheetIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sheetText: { fontSize: 15, fontWeight: '400', color: colors.neutral.text },
});
