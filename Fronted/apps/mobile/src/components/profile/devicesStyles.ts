import { StyleSheet } from 'react-native';
import { colors, spacing, radii } from '@beeapp/design-system';

/** Estilos de la pantalla de Dispositivos (separados para mantener archivos <300 líneas) */
export const devicesStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.neutral.gray50 },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  backBtn: { padding: 4, marginRight: spacing.sm },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.neutral.text },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 120 },

  section: {
    backgroundColor: colors.neutral.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral.text,
    marginBottom: spacing.md,
  },

  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderRadius: radii.lg,
    backgroundColor: colors.brand.primary,
  },
  scanBtnText: { fontSize: 15, fontWeight: '600', color: colors.neutral.white },
  scanHint: {
    fontSize: 12.5,
    fontWeight: '400',
    color: colors.neutral.gray600,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: spacing.md,
  },

  // Marco simulado de la cámara
  scanner: {
    height: 260,
    borderRadius: radii.lg,
    backgroundColor: colors.neutral.gray900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 150,
    height: 150,
    borderWidth: 2,
    borderColor: colors.neutral.white,
    borderRadius: radii.md,
    opacity: 0.9,
  },
  scannerText: {
    fontSize: 12.5,
    fontWeight: '400',
    color: colors.neutral.white,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  cancelScanBtn: { marginTop: spacing.md, alignSelf: 'center', padding: spacing.sm },
  cancelScanText: { fontSize: 13, fontWeight: '400', color: colors.neutral.gray600 },

  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  rowSeparator: { borderBottomWidth: 1, borderBottomColor: colors.neutral.gray100 },
  deviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  deviceInfo: { flex: 1 },
  deviceName: { fontSize: 14, fontWeight: '600', color: colors.neutral.text },
  deviceMeta: { fontSize: 12, fontWeight: '400', color: colors.neutral.gray600, marginTop: 2 },
  signOutBtn: { paddingHorizontal: spacing.sm, paddingVertical: 6 },
  signOutText: { fontSize: 12.5, fontWeight: '400', color: colors.semantic.error },

  emptyText: {
    fontSize: 12.5,
    fontWeight: '400',
    color: colors.neutral.gray600,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  signOutAllBtn: {
    marginTop: spacing.md,
    height: 46,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.semantic.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutAllText: { fontSize: 14, fontWeight: '600', color: colors.semantic.error },
});
