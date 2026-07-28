import { StyleSheet } from 'react-native';
import { colors } from '@beeapp/design-system';

/** Estilos de la pantalla de Contactos (separados para mantener archivos <300 líneas) */
export const contactsStyles = StyleSheet.create({
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.neutral.text,
  },
  addBtn: {
    padding: 6,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    gap: 4,
    backgroundColor: colors.neutral.gray50,
  },
  tabBtnActive: {
    borderColor: colors.brand.primary,
    backgroundColor: '#FBFBFF',
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.gray700,
  },
  tabBtnTextActive: {
    color: colors.brand.primary,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  privacyNotice: {
    flexDirection: 'row',
    backgroundColor: '#F3E8FF',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    alignItems: 'flex-start',
  },
  noticeIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  noticeText: {
    flex: 1,
    fontSize: 11,
    color: '#6B21A8',
    lineHeight: 15,
    fontWeight: '500',
  },
  contactsList: {
    backgroundColor: colors.neutral.white,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  rowSeparator: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.neutral.text,
  },
  detailsCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  nameBadge: {
    marginLeft: 4,
  },
  contactName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  favBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  favBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#D97706',
  },
  contactSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
    color: colors.neutral.gray600,
  },
  actionsCol: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 8,
  },
  actionIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral.gray50,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  callTypeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.gray700,
  },
  callTypeTextMissed: {
    color: '#EF4444',
    fontWeight: '800',
  },
  callMetaDivider: {
    fontSize: 11,
    color: colors.neutral.gray400,
  },
  callMetaText: {
    fontSize: 11,
    color: colors.neutral.gray600,
    fontWeight: '600',
  },
  callTimeText: {
    fontSize: 10,
    color: colors.neutral.gray500,
    marginTop: 4,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.neutral.text,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 12,
    color: colors.neutral.gray600,
    textAlign: 'center',
    lineHeight: 18,
  },
});
