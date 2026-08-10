import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, radii } from '@beeapp/design-system';
import { MY_CONTACTS, ContactItem } from '../../../mocks/contacts';

interface MentionDropdownProps {
  /** Texto escrito después de la "@". Cadena vacía = aún no filtra nada */
  query: string;
  onSelect: (contact: ContactItem) => void;
}

const initialsOf = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

/** Lista de contactos que aparece al escribir "@" en una capa de texto */
export default function MentionDropdown({ query, onSelect }: MentionDropdownProps) {
  const matches = MY_CONTACTS.filter((contact) =>
    contact.name.toLowerCase().includes(query.toLowerCase())
  );

  if (matches.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <ScrollView keyboardShouldPersistTaps="handled">
        {matches.map((contact) => (
          <TouchableOpacity
            key={contact.id}
            style={styles.row}
            onPress={() => onSelect(contact)}
            activeOpacity={0.7}
          >
            <View style={[styles.avatar, { backgroundColor: contact.color }]}>
              <Text style={styles.initials}>{initialsOf(contact.name)}</Text>
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {contact.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    maxHeight: 180,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    backgroundColor: colors.neutral.white,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 12, fontWeight: '400', color: colors.brand.primary },
  name: { flex: 1, fontSize: 14, fontWeight: '400', color: colors.neutral.text },
});
