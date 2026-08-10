import { useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { colors, spacing, radii } from '@beeapp/design-system';
import { Search } from 'lucide-react-native';
import { COUNTRIES, Country } from '../../mocks/countries';

interface CountryCodeModalProps {
  visible: boolean;
  onSelect: (country: Country) => void;
  onClose: () => void;
}

/** Country dial-code picker of the new contact form */
export default function CountryCodeModal({ visible, onSelect, onClose }: CountryCodeModalProps) {
  const [query, setQuery] = useState('');

  const text = query.trim().toLowerCase();
  const results = COUNTRIES.filter(
    (country) => country.name.toLowerCase().includes(text) || country.dialCode.includes(text)
  );

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} onPress={onClose} activeOpacity={1} />

        <View style={styles.sheet}>
          <Text style={styles.title}>Indicativo del país</Text>

          <View style={styles.searchBar}>
            <Search size={16} color={colors.neutral.gray500} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar país"
              placeholderTextColor={colors.neutral.gray500}
            />
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {results.map((country) => (
              <TouchableOpacity
                key={`${country.code}-${country.dialCode}`}
                style={styles.row}
                onPress={() => onSelect(country)}
                activeOpacity={0.7}
              >
                <Text style={styles.rowName} numberOfLines={1}>
                  {country.name}
                </Text>
                <Text style={styles.rowCode}>{country.dialCode}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  rowName: { flex: 1, fontSize: 14, fontWeight: '400', color: colors.neutral.text },
  rowCode: { fontSize: 13, fontWeight: '400', color: colors.neutral.gray600 },
});
