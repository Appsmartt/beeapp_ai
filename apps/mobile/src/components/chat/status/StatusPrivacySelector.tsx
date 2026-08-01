import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { colors } from '@beeapp/design-system';
import { Eye, Globe, UserCheck, Tag, Check, X } from 'lucide-react-native';
import { MY_CONTACTS } from '../../../mocks/contacts';
import { MOCK_CATEGORIES } from '../../../mocks/chats';

export type StatusVisibility = 'all' | 'selected' | 'category';

interface StatusPrivacySelectorProps {
  visibility: StatusVisibility;
  onChangeVisibility: (v: StatusVisibility) => void;
  selectedContactIds: string[];
  onChangeSelectedContacts: (ids: string[]) => void;
  selectedCategoryId: string | null;
  onChangeSelectedCategory: (id: string) => void;
}

export default function StatusPrivacySelector({
  visibility,
  onChangeVisibility,
  selectedContactIds,
  onChangeSelectedContacts,
  selectedCategoryId,
  onChangeSelectedCategory,
}: StatusPrivacySelectorProps) {
  const [contactsModalOpen, setContactsModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  const toggleContact = (id: string) => {
    if (selectedContactIds.includes(id)) {
      onChangeSelectedContacts(selectedContactIds.filter((cId) => cId !== id));
    } else {
      onChangeSelectedContacts([...selectedContactIds, id]);
    }
  };

  const selectedCategoryName = MOCK_CATEGORIES.find((c) => c.id === selectedCategoryId)?.name;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Eye size={14} color={colors.neutral.gray600} />
        <Text style={styles.title}>¿Quién puede ver tu estado?</Text>
      </View>

      <View style={styles.chipsRow}>
        <TouchableOpacity
          style={[styles.chip, visibility === 'all' && styles.chipActive]}
          onPress={() => onChangeVisibility('all')}
          activeOpacity={0.7}
        >
          <Globe size={12} color={visibility === 'all' ? colors.neutral.white : colors.neutral.gray600} />
          <Text style={[styles.chipText, visibility === 'all' && styles.chipTextActive]}>Todos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.chip, visibility === 'selected' && styles.chipActive]}
          onPress={() => {
            onChangeVisibility('selected');
            setContactsModalOpen(true);
          }}
          activeOpacity={0.7}
        >
          <UserCheck size={12} color={visibility === 'selected' ? colors.neutral.white : colors.neutral.gray600} />
          <Text style={[styles.chipText, visibility === 'selected' && styles.chipTextActive]}>
            {selectedContactIds.length > 0 ? `${selectedContactIds.length} selec.` : 'Contactos'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.chip, visibility === 'category' && styles.chipActive]}
          onPress={() => {
            onChangeVisibility('category');
            setCategoryModalOpen(true);
          }}
          activeOpacity={0.7}
        >
          <Tag size={12} color={visibility === 'category' ? colors.neutral.white : colors.neutral.gray600} />
          <Text style={[styles.chipText, visibility === 'category' && styles.chipTextActive]}>
            {selectedCategoryName || 'Categoría'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal Selección de Contactos */}
      <Modal visible={contactsModalOpen} transparent animationType="slide" onRequestClose={() => setContactsModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Contactos</Text>
              <TouchableOpacity onPress={() => setContactsModalOpen(false)}><X size={20} color={colors.neutral.text} /></TouchableOpacity>
            </View>
            <FlatList
              data={MY_CONTACTS}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isSelected = selectedContactIds.includes(item.id);
                return (
                  <TouchableOpacity style={styles.itemRow} onPress={() => toggleContact(item.id)}>
                    <Text style={styles.itemText}>{item.name}</Text>
                    <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                      {isSelected && <Check size={12} color={colors.neutral.white} />}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Modal Selección de Categoría */}
      <Modal visible={categoryModalOpen} transparent animationType="slide" onRequestClose={() => setCategoryModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Categoría</Text>
              <TouchableOpacity onPress={() => setCategoryModalOpen(false)}><X size={20} color={colors.neutral.text} /></TouchableOpacity>
            </View>
            <FlatList
              data={MOCK_CATEGORIES}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.itemRow}
                  onPress={() => {
                    onChangeSelectedCategory(item.id);
                    setCategoryModalOpen(false);
                  }}
                >
                  <Text style={styles.itemText}>{item.name}</Text>
                  {selectedCategoryId === item.id && <Check size={16} color={colors.brand.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 12, paddingVertical: 6 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  title: { fontSize: 11, fontWeight: '600', color: colors.neutral.gray600 },
  chipsRow: { flexDirection: 'row', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: colors.neutral.gray100 },
  chipActive: { backgroundColor: colors.brand.primary },
  chipText: { fontSize: 11, color: colors.neutral.gray700, fontWeight: '500' },
  chipTextActive: { color: colors.neutral.white },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.neutral.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.neutral.text },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral.gray100 },
  itemText: { fontSize: 14, color: colors.neutral.text },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: colors.neutral.gray400, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
});
