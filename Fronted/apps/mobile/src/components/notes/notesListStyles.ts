import { StyleSheet } from 'react-native';
import { colors } from '@beeapp/design-system';

const FAB_BOTTOM_OFFSET = 105; // Spacing offset to separate FAB from FloatingTabBar

/** Estilos de la lista de notas (separados para mantener archivos <300 líneas) */
export const notesListStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.gray50,
  },
  container: {
    flex: 1,
  },
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
  headerLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  headerRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sortToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.gray50,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  sortToggleText: {
    fontSize: 10,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  filtersContainer: {
    paddingVertical: 10,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
  },
  filtersScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: colors.neutral.gray50,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  filterChipActive: {
    backgroundColor: colors.brand.primary + '15',
    borderColor: colors.brand.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray700,
  },
  filterChipTextActive: {
    color: colors.brand.primary,
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 120,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.neutral.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral.text,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.neutral.gray600,
    textAlign: 'center',
    lineHeight: 18,
  },
  headerActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  createFab: {
    position: 'absolute',
    bottom: FAB_BOTTOM_OFFSET,
    right: 20,
    backgroundColor: colors.brand.primary,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  createFabText: {
    color: colors.neutral.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
