
import { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { colors, spacing } from '@beeapp/design-system';
import { Menu, Search, SlidersHorizontal, X } from 'lucide-react-native';
import SearchFilterMenu, { FilterAnchor } from './SearchFilterMenu';
import { FILTER_OPTIONS, SearchFilterType } from './searchFilters';

export type { SearchFilterType };

interface HomeHeaderProps {
  onMenuPress: () => void;
}

export default function HomeHeader({ onMenuPress }: HomeHeaderProps) {
  const [activeFilter, setActiveFilter] = useState<SearchFilterType | null>(null);
  const [anchor, setAnchor] = useState<FilterAnchor | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const filterBtnRef = useRef<TouchableOpacity>(null);

  const activeOption = FILTER_OPTIONS.find((opt) => opt.id === activeFilter) ?? null;
  const FilterIcon = activeOption ? activeOption.icon : SlidersHorizontal;

  // The dropdown lives in a Modal, so it needs the trigger position in window coords
  const openFilterMenu = () => {
    filterBtnRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
    });
  };

  const handleSelectFilter = (filter: SearchFilterType) => {
    setActiveFilter(filter);
    setAnchor(null);
  };

  return (
    <View style={styles.headerWrap}>
      <View style={styles.headerRow}>
        {/* Search bar with content-type filter */}
        <View style={styles.searchBar}>
          <TouchableOpacity
            ref={filterBtnRef}
            style={[styles.filterBtn, activeOption && styles.filterBtnActive]}
            onPress={openFilterMenu}
            activeOpacity={0.7}
          >
            <FilterIcon size={18} color={activeOption ? colors.brand.primary : colors.neutral.gray600} />
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
            <TouchableOpacity style={styles.inputWrap} onPress={openFilterMenu} activeOpacity={0.7}>
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

      {/* Content-type dropdown, rendered above every other Home layer */}
      <SearchFilterMenu
        anchor={anchor}
        activeFilter={activeFilter}
        onSelect={handleSelectFilter}
        onClose={() => setAnchor(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    marginBottom: spacing.md,
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
    paddingHorizontal: 6,
    height: 44,
    marginRight: 10,
  },
  filterBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.gray50,
  },
  filterBtnActive: {
    backgroundColor: '#F3E8FF',
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
});
