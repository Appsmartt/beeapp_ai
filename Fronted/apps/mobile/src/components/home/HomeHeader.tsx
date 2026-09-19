
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
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DDE4F4',
    paddingHorizontal: 7,
    height: 48,
    marginRight: 10,
    shadowColor: '#9CA9CF',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2,
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#D7DFF2',
  },
  filterBtnActive: {
    backgroundColor: '#E7E8FF',
    borderColor: '#BFC6EE',
  },
  searchDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#DDE4F4',
    marginHorizontal: 9,
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
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: '#F0F2FF',
    borderWidth: 1,
    borderColor: '#D5DDF1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#9CA9CF',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 7,
    elevation: 2,
  },
});
