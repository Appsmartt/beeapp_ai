import { StyleSheet } from 'react-native';
import { colors } from '@beeapp/design-system';

// Helper to get initials for avatar mock
export const getInitials = (text: string) => {
  if (!text) return '';
  return text
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

// Estilos compartidos entre los pasos del onboarding
export const sharedStyles = StyleSheet.create({
  stepWrapper: {
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.neutral.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.neutral.gray600,
    lineHeight: 20,
    marginBottom: 24,
  },
  sectionCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.text,
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.neutral.gray600,
    marginTop: -12,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputField: {
    backgroundColor: colors.neutral.gray50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.neutral.text,
    fontWeight: '400',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarButton: {
    marginRight: 16,
  },
  avatarCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.neutral.gray100,
    borderWidth: 2,
    borderColor: colors.neutral.gray300,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '400',
    color: colors.neutral.white,
  },
  avatarCheckBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.semantic.success,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.neutral.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCheckText: {
    color: colors.neutral.white,
    fontSize: 10,
    fontWeight: '400',
  },
  avatarPlaceholderText: {
    fontSize: 9,
    fontWeight: '400',
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
  },
  avatarInfo: {
    flex: 1,
  },
  avatarInfoTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral.text,
    marginBottom: 2,
  },
  avatarInfoDesc: {
    fontSize: 12,
    color: colors.neutral.gray600,
  },
});
