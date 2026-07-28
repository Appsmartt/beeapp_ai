import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { colors, spacing, radii } from '@beeapp/design-system';
import { Search, Check } from 'lucide-react-native';
import { MY_CONTACTS } from '../../mocks/contacts';
import { GroupMember } from '../../mocks/chats';

interface AddMemberModalProps {
  visible: boolean;
  /** Ids already in the group: those contacts are not offered again */
  memberIds: string[];
  onAdd: (members: GroupMember[]) => void;
  onClose: () => void;
}

/** Picks one or more contacts to add to the group (mock, in memory) */
export default function AddMemberModal({ visible, memberIds, onAdd, onClose }: AddMemberModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Every time the sheet opens the selection starts empty
  useEffect(() => {
    if (visible) {
      setQuery('');
      setSelectedIds([]);
    }
  }, [visible]);

  const available = useMemo(() => {
    const text = query.trim().toLowerCase();
    return MY_CONTACTS.filter(
      (contact) =>
        !memberIds.includes(contact.id) &&
        (text === '' || contact.name.toLowerCase().includes(text))
    );
  }, [query, memberIds]);

  const toggle = (id: string) =>
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const handleAdd = () => {
    const newMembers: GroupMember[] = MY_CONTACTS.filter((c) => selectedIds.includes(c.id)).map((c) => ({
      id: c.id,
      name: c.name,
      role: 'member',
      initials: c.initials,
      color: c.color,
    }));
    onAdd(newMembers);
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} onPress={onClose} activeOpacity={1} />

        <View style={styles.sheet}>
          <Text style={styles.title}>Agregar miembro</Text>

          <View style={styles.searchBar}>
            <Search size={16} color={colors.neutral.gray500} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar contacto"
              placeholderTextColor={colors.neutral.gray500}
            />
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {available.length === 0 ? (
              <Text style={styles.emptyText}>No hay contactos disponibles para agregar.</Text>
            ) : (
              available.map((contact) => {
                const isSelected = selectedIds.includes(contact.id);
                return (
                  <TouchableOpacity
                    key={contact.id}
                    style={styles.row}
                    onPress={() => toggle(contact.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.avatar, { backgroundColor: contact.color }]}>
                      <Text style={styles.avatarText}>{contact.initials}</Text>
                    </View>

                    <View style={styles.rowTexts}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {contact.name}
                      </Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {contact.profession}
                      </Text>
                    </View>

                    {isSelected && <Check size={18} color={colors.brand.primary} />}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          <TouchableOpacity
            style={[styles.addBtn, selectedIds.length === 0 && styles.addBtnDisabled]}
            disabled={selectedIds.length === 0}
            onPress={handleAdd}
            activeOpacity={0.8}
          >
            <Text style={styles.addBtnText}>
              {selectedIds.length > 0 ? `Agregar (${selectedIds.length})` : 'Agregar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(26, 26, 46, 0.4)', justifyContent: 'flex-end' },
  backdropTouch: { flex: 1 },
  sheet: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '80%',
  },
  title: { fontSize: 16, fontWeight: '600', color: colors.neutral.text },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.neutral.gray100,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: spacing.md,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '400', color: colors.neutral.text, padding: 0 },
  list: { marginTop: spacing.sm },
  emptyText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.neutral.gray600,
    paddingVertical: spacing.lg,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 13, fontWeight: '600', color: colors.brand.primary },
  rowTexts: { flex: 1, paddingRight: spacing.sm },
  rowName: { fontSize: 14, fontWeight: '400', color: colors.neutral.text },
  rowMeta: { fontSize: 12, fontWeight: '400', color: colors.neutral.gray600, marginTop: 2 },
  addBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.brand.primary,
    borderRadius: radii.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addBtnDisabled: { backgroundColor: colors.neutral.gray400 },
  addBtnText: { fontSize: 14, fontWeight: '600', color: colors.neutral.white },
});
