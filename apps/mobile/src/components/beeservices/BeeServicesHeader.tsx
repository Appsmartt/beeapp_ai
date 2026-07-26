import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { colors } from '@beeapp/design-system';
import { ChevronLeft, Search, Store } from 'lucide-react-native';

interface BeeServicesHeaderProps {
  /** Omitted when there is nothing to go back to (root of an embedded module) */
  onBack?: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

/** Marketplace header: brand title plus the products & services search box. */
export default function BeeServicesHeader({ onBack, searchQuery, onSearchChange }: BeeServicesHeaderProps) {
  return (
    <>
      <View style={styles.header}>
        <View style={styles.leftCol}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
              <ChevronLeft size={24} color={colors.neutral.text} />
            </TouchableOpacity>
          )}
          <View style={styles.brandIcon}>
            <Store size={16} color={colors.brand.primary} />
          </View>
          <View>
            <Text style={styles.title}>BeeServices</Text>
            <Text style={styles.subtitle}>Productos y servicios de la red</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Search size={18} color={colors.neutral.gray500} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar productos y servicios..."
          placeholderTextColor={colors.neutral.gray500}
          value={searchQuery}
          onChangeText={onSearchChange}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
  },
  leftCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    padding: 4,
    marginRight: 4,
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.neutral.text,
  },
  subtitle: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.neutral.gray600,
    marginTop: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.neutral.text,
    paddingVertical: 6,
    fontWeight: '500',
  },
});
