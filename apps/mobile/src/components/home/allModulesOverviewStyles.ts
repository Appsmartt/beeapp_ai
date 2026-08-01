import { StyleSheet } from 'react-native';
import { colors, spacing } from '@beeapp/design-system';

export const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.neutral.gray50,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },

  /* BeeServices Hero Card (Full Width Top - Solid Purple Accent) */
  beeServicesCard: {
    backgroundColor: '#FAF5FF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.40)',
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  beeServicesTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  beeServicesIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  beeServicesTextCol: {
    flex: 1,
  },
  beeServicesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  beeServicesSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray600,
    marginTop: 1,
  },
  beeServicesDescText: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.neutral.gray600,
    marginTop: 8,
    lineHeight: 16,
  },
  beeServicesMetricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  beeMetricBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.10)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  beeMetricText: {
    fontSize: 10,
    fontWeight: '400',
    color: colors.brand.primary,
  },
  beeServicesHighlightsRow: {
    flexDirection: 'column',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 58, 237, 0.15)',
  },
  beeHighlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  beeHighlightText: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.neutral.gray700,
  },

  /* Grid 2 Columnas - Modulos Equilibrados */
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  gridCard: {
    width: '48%',
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 14,
    minHeight: 170,
    justifyContent: 'space-between',
  },
  fullWidthGridCard: {
    width: '100%',
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 14,
    minHeight: 180,
    justifyContent: 'space-between',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
  },

  /* Métricas Normales (Fondo gray100, Texto gray700) */
  badgePill: {
    backgroundColor: colors.neutral.gray100,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '400',
    color: colors.neutral.gray700,
  },
  badgePillGray: {
    backgroundColor: colors.neutral.gray100,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeTextGray: {
    fontSize: 10,
    fontWeight: '400',
    color: colors.neutral.gray700,
  },

  /* Métricas Urgentes / Atención (Fondo Rojo Opacidad Baja, Texto Rojo Suave) */
  badgePillRed: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeTextRed: {
    fontSize: 10,
    fontWeight: '400',
    color: '#EF4444',
  },
  badgePillOrange: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeTextOrange: {
    fontSize: 10,
    fontWeight: '400',
    color: '#EF4444',
  },

  cardTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral.gray800,
    marginTop: 8,
  },
  cardSubtitle: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.neutral.gray500,
    marginTop: 1,
  },
  cardFooterBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.gray100,
  },
  cardPreviewText: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.neutral.gray500,
  },
  avatarsFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatarsOverlap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.neutral.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 8,
    fontWeight: '400',
  },
  avatarsLabel: {
    fontSize: 10,
    fontWeight: '400',
    color: colors.neutral.gray500,
    flex: 1,
  },
  eventFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: colors.neutral.gray200,
    borderRadius: 2,
    width: '100%',
    marginVertical: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 4,
    backgroundColor: 'rgba(124, 58, 237, 0.50)',
    borderRadius: 2,
  },
  fileMiniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  fileNameText: {
    fontSize: 10,
    fontWeight: '400',
    color: colors.neutral.gray700,
    flex: 1,
  },
  fileSizeText: {
    fontSize: 9,
    fontWeight: '400',
    color: colors.neutral.gray500,
    marginLeft: 4,
  },
});
