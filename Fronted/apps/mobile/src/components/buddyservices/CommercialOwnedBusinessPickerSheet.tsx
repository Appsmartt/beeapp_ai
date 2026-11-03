import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Check,
  ChevronRight,
  Store,
  X,
} from 'lucide-react-native';

import type { CommercialOwnedProfile } from '@beeapp/shared-types';

interface CommercialOwnedBusinessPickerSheetProps {
  businesses: CommercialOwnedProfile[];
  eyebrow?: string;
  loading?: boolean;
  onClose: () => void;
  onSelect: (businessId: string) => void;
  onViewAllPress: () => void;
  selectedBusinessId: string | null;
  title?: string;
  unreadByBusinessId?: Record<string, number>;
  visible: boolean;
}

export default function CommercialOwnedBusinessPickerSheet({
  businesses,
  eyebrow = 'Negocio activo',
  loading = false,
  onClose,
  onSelect,
  onViewAllPress,
  selectedBusinessId,
  title = 'Elige un negocio',
  unreadByBusinessId = {},
  visible,
}: CommercialOwnedBusinessPickerSheetProps) {
  if (!visible) {
    return null;
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityLabel="Cerrar selector de negocios"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdropTap}
        />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerTextColumn}>
              <Text style={styles.eyebrow}>
                {eyebrow}
              </Text>

              <Text style={styles.title}>
                {title}
              </Text>
            </View>

            <TouchableOpacity
              accessibilityLabel="Cerrar"
              accessibilityRole="button"
              activeOpacity={0.75}
              hitSlop={10}
              onPress={onClose}
              style={styles.closeButton}
            >
              <X
                color="#5E4A83"
                size={20}
                strokeWidth={2.4}
              />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator
                color="#7427D5"
                size="small"
              />

              <Text style={styles.loadingText}>
                Cargando tus negocios…
              </Text>
            </View>
          ) : businesses.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                No tienes negocios aún
              </Text>

              <Text style={styles.emptyText}>
                Crea uno desde Mis negocios para administrarlo aquí.
              </Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              style={styles.list}
            >
              {businesses.map((business) => {
                const isSelected = business.id === selectedBusinessId;
                const unreadCount = unreadByBusinessId[business.id] || 0;

                return (
                  <TouchableOpacity
                    accessibilityLabel={`Seleccionar ${business.display_name}`}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: isSelected,
                    }}
                    activeOpacity={0.82}
                    key={business.id}
                    onPress={() => {
                      onSelect(business.id);
                      onClose();
                    }}
                    style={[
                      styles.businessRow,
                      isSelected && styles.businessRowSelected,
                    ]}
                  >
                    <View style={styles.businessIconWrap}>
                      <Store
                        color={isSelected ? '#7427D5' : '#7567D9'}
                        size={18}
                        strokeWidth={2.2}
                      />
                    </View>

                    <View style={styles.businessTextColumn}>
                      <Text
                        numberOfLines={1}
                        style={styles.businessName}
                      >
                        {business.display_name}
                      </Text>

                      <Text
                        numberOfLines={1}
                        style={styles.businessMeta}
                      >
                        {`${business.city}, ${business.country_code}`}
                      </Text>
                    </View>

                    {isSelected ? (
                      <View style={styles.selectedBadge}>
                        <Check
                          color="#FFFFFF"
                          size={14}
                          strokeWidth={3}
                        />
                      </View>
                    ) : unreadCount > 0 ? (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Text>
                      </View>
                    ) : (
                      <ChevronRight
                        color="#B8A8CC"
                        size={18}
                        strokeWidth={2.3}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <TouchableOpacity
            accessibilityLabel="Ver todos mis negocios"
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={() => {
              onClose();
              onViewAllPress();
            }}
            style={styles.viewAllButton}
          >
            <Text style={styles.viewAllText}>
              Ver todos en Mis negocios
            </Text>

            <ChevronRight
              color="#7427D5"
              size={18}
              strokeWidth={2.4}
            />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(38, 49, 77, 0.48)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropTap: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#F7F8FF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '72%',
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: '#D9CEE5',
    borderRadius: 999,
    height: 4,
    marginBottom: 14,
    width: 42,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  headerTextColumn: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: '#6C7892',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    color: '#26314D',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
    marginTop: 4,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2D6F0',
    borderRadius: 12,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  loadingState: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 28,
  },
  loadingText: {
    color: '#6C7892',
    fontSize: 13,
  },
  emptyState: {
    paddingBottom: 12,
    paddingTop: 8,
  },
  emptyTitle: {
    color: '#26314D',
    fontSize: 15,
    fontWeight: '800',
  },
  emptyText: {
    color: '#6C7892',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  list: {
    maxHeight: 320,
  },
  listContent: {
    gap: 8,
    paddingBottom: 4,
  },
  businessRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#F0EAF3',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 62,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  businessRowSelected: {
    borderColor: '#C9B3EE',
    backgroundColor: '#FBF8FF',
  },
  businessIconWrap: {
    alignItems: 'center',
    backgroundColor: '#F6EAFE',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  businessTextColumn: {
    flex: 1,
    marginHorizontal: 10,
    minWidth: 0,
  },
  businessName: {
    color: '#26314D',
    fontSize: 14,
    fontWeight: '800',
  },
  businessMeta: {
    color: '#6C7892',
    fontSize: 11,
    marginTop: 2,
  },
  selectedBadge: {
    alignItems: 'center',
    backgroundColor: '#7427D5',
    borderRadius: 999,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  unreadBadge: {
    alignItems: 'center',
    backgroundColor: '#7427D5',
    borderRadius: 999,
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  viewAllButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2D6F0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  viewAllText: {
    color: '#7427D5',
    fontSize: 13,
    fontWeight: '800',
  },
});
