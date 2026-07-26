
import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { colors } from '@beeapp/design-system';
import {
  Menu,
  Search,
  SlidersHorizontal,
  ChevronDown,
  X,
  Mail,
  MessageCircle,
  StickyNote,
  UserRound,
  Folder,
  CalendarDays,
} from 'lucide-react-native';

export type SearchFilterType = 'correo' | 'chat' | 'nota' | 'contacto' | 'archivo' | 'evento';

const FILTER_OPTIONS: { id: SearchFilterType; label: string; icon: typeof Mail }[] = [
  { id: 'correo', label: 'Correo', icon: Mail },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'nota', label: 'Nota', icon: StickyNote },
  { id: 'contacto', label: 'Contacto', icon: UserRound },
  { id: 'archivo', label: 'Archivo', icon: Folder },
  { id: 'evento', label: 'Evento', icon: CalendarDays },
];

interface HomeHeaderProps {
  onMenuPress: () => void;
}

export default function HomeHeader({ onMenuPress }: HomeHeaderProps) {
  const [activeFilter, setActiveFilter] = useState<SearchFilterType | null>(null);
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const activeOption = FILTER_OPTIONS.find((opt) => opt.id === activeFilter) ?? null;
  const FilterIcon = activeOption ? activeOption.icon : SlidersHorizontal;

  const handleSelectFilter = (filter: SearchFilterType) => {
    setActiveFilter(filter);
    setFilterMenuVisible(false);
  };

  return (
    <View style={styles.headerWrap}>
      <View style={styles.headerRow}>
        {/* Search bar with content-type filter */}
        <View style={styles.searchBar}>
          <TouchableOpacity
            style={[styles.filterChip, activeOption && styles.filterChipActive]}
            onPress={() => setFilterMenuVisible(!filterMenuVisible)}
            activeOpacity={0.7}
          >
            <FilterIcon size={14} color={activeOption ? colors.brand.primary : colors.neutral.gray600} />
            <Text style={[styles.filterChipText, activeOption && styles.filterChipTextActive]}>
              {activeOption ? activeOption.label : 'Filtro'}
            </Text>
            <ChevronDown size={12} color={activeOption ? colors.brand.primary : colors.neutral.gray500} />
          </TouchableOpacity>

          <View style={styles.searchDivider} />

          {activeOption ? (
            <View style={styles.inputWrap}>
              <Search size={16} color={colors.neutral.gray500} style={{ marginRight: 6 }} />
              <TextInput
                style={styles.searchInput}
                placeholder={`Buscar en ${activeOption.label.toLowerCase()}...`}
                placeholderTextColor={colors.neutral.gray500}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                  <X size={14} color={colors.neutral.gray500} />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            // Until a filter is chosen, tapping the input area opens the filter menu
            <TouchableOpacity
              style={styles.inputWrap}
              onPress={() => setFilterMenuVisible(true)}
              activeOpacity={0.7}
            >
              <Search size={16} color={colors.neutral.gray500} style={{ marginRight: 6 }} />
              <Text style={styles.inputPlaceholder}>Elige qué buscar...</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Side menu (hamburger) button */}
        <TouchableOpacity style={styles.menuBtn} onPress={onMenuPress} activeOpacity={0.7}>
          <Menu size={22} color={colors.neutral.text} />
        </TouchableOpacity>
      </View>

      {/* Content-type dropdown */}
      {filterMenuVisible && (
        <View style={styles.filterDropdown}>
          <Text style={styles.dropdownTitle}>¿Qué quieres buscar?</Text>
          {FILTER_OPTIONS.map((opt) => {
            const isActive = activeFilter === opt.id;
            const OptIcon = opt.icon;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.dropdownItem, isActive && styles.dropdownItemActive]}
                onPress={() => handleSelectFilter(opt.id)}
                activeOpacity={0.7}
              >
                <OptIcon size={16} color={isActive ? colors.brand.primary : colors.neutral.gray600} />
                <Text style={[styles.dropdownItemText, isActive && styles.dropdownItemTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    marginBottom: 20,
    zIndex: 50,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    paddingHorizontal: 8,
    height: 44,
    marginRight: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.gray50,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: '#F3E8FF',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.gray600,
  },
  filterChipTextActive: {
    color: colors.brand.primary,
  },
  searchDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.neutral.gray200,
    marginHorizontal: 8,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.neutral.text,
    fontWeight: '500',
    paddingVertical: 0,
  },
  inputPlaceholder: {
    fontSize: 13,
    color: colors.neutral.gray500,
    fontWeight: '500',
  },
  menuBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterDropdown: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 54,
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    paddingVertical: 8,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  dropdownTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    gap: 10,
  },
  dropdownItemActive: {
    backgroundColor: '#F9F5FF',
  },
  dropdownItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  dropdownItemTextActive: {
    color: colors.brand.primary,
    fontWeight: '700',
  },
});
