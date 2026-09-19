import { ActivityIndicator, View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, TouchableWithoutFeedback } from 'react-native';
import { colors } from '@beeapp/design-system';
import { Eye, X } from 'lucide-react-native';
import { StatusViewedBy } from '../../mocks/statuses';

interface StatusViewersSheetProps {
  visible: boolean;
  viewedBy?: StatusViewedBy[];
  viewerCount?: number;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onClose: () => void;
}

export default function StatusViewersSheet({
  visible,
  viewedBy = [],
  viewerCount,
  loading = false,
  error = null,
  onRetry,
  onClose,
}: StatusViewersSheetProps) {
  if (!visible) return null;

  const displayedCount = viewerCount ?? viewedBy.length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <View style={styles.header}>
                <View style={styles.titleRow}>
                  <Eye size={18} color={colors.brand.primary} />
                  <Text style={styles.title}>
                    Visto por {displayedCount}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <X size={20} color={colors.neutral.text} />
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={styles.state}>
                  <ActivityIndicator
                    color={colors.brand.primary}
                  />
                  <Text style={styles.stateText}>
                    Cargando vistas...
                  </Text>
                </View>
              ) : error ? (
                <View style={styles.state}>
                  <Text style={styles.errorText}>
                    {error}
                  </Text>
                  {onRetry ? (
                    <TouchableOpacity
                      onPress={onRetry}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.retryText}>
                        Reintentar
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : (
                <FlatList
                  data={viewedBy}
                  keyExtractor={(item, idx) => (
                    item.contactId + idx
                  )}
                  renderItem={({ item }) => (
                    <View style={styles.viewerRow}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {item.contactName
                            .slice(0, 2)
                            .toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.infoCol}>
                        <Text style={styles.name}>
                          {item.contactName}
                        </Text>
                        <Text style={styles.time}>
                          {item.viewedAt}
                        </Text>
                      </View>
                    </View>
                  )}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>
                      Aún no hay vistas.
                    </Text>
                  }
                  contentContainerStyle={styles.listContent}
                />
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.neutral.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '50%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '700', color: colors.neutral.text },
  closeBtn: { padding: 4 },
  listContent: { paddingBottom: 20 },
  state: { alignItems: 'center', gap: 10, paddingVertical: 28 },
  stateText: { color: colors.neutral.gray600, fontSize: 13 },
  errorText: { color: colors.semantic.error, fontSize: 13, textAlign: 'center' },
  retryText: { color: colors.brand.primary, fontSize: 13, fontWeight: '700' },
  emptyText: { color: colors.neutral.gray600, fontSize: 13, paddingVertical: 28, textAlign: 'center' },
  viewerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.neutral.gray100, gap: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brand.primary + '18', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '600', color: colors.brand.primary },
  infoCol: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: colors.neutral.text },
  time: { fontSize: 11, color: colors.neutral.gray500, marginTop: 1 },
});
