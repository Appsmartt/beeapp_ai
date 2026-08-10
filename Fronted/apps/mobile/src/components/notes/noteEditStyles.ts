import { StyleSheet } from 'react-native';
import { colors } from '@beeapp/design-system';

/** Estilos del editor de notas, compartidos con sus sub-componentes */
export const noteEditStyles = StyleSheet.create({
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
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  saveHeaderBtn: {
    padding: 6,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.neutral.text,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray200,
    marginBottom: 16,
  },
  metaConfigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  favToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  favToggleBtnActive: {
    backgroundColor: colors.brand.primary + '15',
    borderColor: colors.brand.primary,
  },
  favToggleText: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.neutral.gray700,
    marginLeft: 6,
  },
  favToggleTextActive: {
    color: colors.brand.primary,
    fontWeight: '600',
  },
  reminderRow: {
    marginBottom: 20,
    gap: 8,
  },
  reminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  reminderBtnActive: {
    backgroundColor: colors.brand.primary + '15',
    borderColor: colors.brand.primary,
  },
  reminderBtnText: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.neutral.gray700,
  },
  reminderBtnTextActive: {
    color: colors.brand.primary,
    fontWeight: '600',
  },
  reminderFieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reminderFieldInput: {
    flex: 1,
    fontSize: 12,
    color: colors.neutral.text,
    fontWeight: '400',
    paddingVertical: 2,
  },
  protectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    gap: 10,
  },
  protectRowActive: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.primary + '05',
  },
  protectIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.neutral.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  protectIconWrapActive: {
    backgroundColor: colors.brand.primary,
  },
  protectTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  protectTitleActive: {
    color: colors.brand.primary,
  },
  protectDesc: {
    fontSize: 10,
    fontWeight: '400',
    color: colors.neutral.gray600,
    marginTop: 2,
    lineHeight: 14,
  },
  protectAction: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
  },
  protectActionActive: {
    color: colors.brand.primary,
  },
  bodyInput: {
    backgroundColor: colors.neutral.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 16,
    fontSize: 14,
    color: colors.neutral.text,
    lineHeight: 22,
    fontWeight: '400',
    minHeight: 280,
    textAlignVertical: 'top',
  },
});

/** Estilos añadidos por el editor con formato (Fase 2) */
export const noteEditExtraStyles = StyleSheet.create({
  chipsRow: { marginBottom: 16 },
  divider: { height: 1, backgroundColor: colors.neutral.gray200, marginBottom: 16 },
  previewBox: {
    backgroundColor: colors.neutral.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 16,
    minHeight: 280,
  },
});
