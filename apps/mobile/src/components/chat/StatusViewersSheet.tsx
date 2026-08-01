import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, TouchableWithoutFeedback } from 'react-native';
import { colors } from '@beeapp/design-system';
import { Eye, X } from 'lucide-react-native';
import { StatusViewedBy } from '../../mocks/statuses';

interface StatusViewersSheetProps {
  visible: boolean;
  viewedBy?: StatusViewedBy[];
  onClose: () => void;
}

export default function StatusViewersSheet({ visible, viewedBy = [], onClose }: StatusViewersSheetProps) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <View style={styles.header}>
                <View style={styles.titleRow}>
                  <Eye size={18} color={colors.brand.primary} />
                  <Text style={styles.title}>Visto por {viewedBy.length}</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <X size={20} color={colors.neutral.text} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={viewedBy}
                keyExtractor={(item, idx) => item.contactId + idx}
                renderItem={({ item }) => (
                  <View style={styles.viewerRow}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{item.contactName.slice(0, 2).toUpperCase()}</Text>
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={styles.name}>{item.contactName}</Text>
                      <Text style={styles.time}>{item.viewedAt}</Text>
                    </View>
                  </View>
                )}
                contentContainerStyle={styles.listContent}
              />
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
  viewerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.neutral.gray100, gap: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brand.primary + '18', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '600', color: colors.brand.primary },
  infoCol: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: colors.neutral.text },
  time: { fontSize: 11, color: colors.neutral.gray500, marginTop: 1 },
});
