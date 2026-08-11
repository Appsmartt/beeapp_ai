import { StyleSheet } from 'react-native';
import { colors } from '@beeapp/design-system';

export const sharedStyles = StyleSheet.create({
  stepWrapper: {
    width: '100%',
  },
  title: {
    color: colors.neutral.text,
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 6,
  },
  subtitle: {
    color: colors.neutral.gray600,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  sectionCard: {
    backgroundColor: colors.neutral.white,
    borderColor: colors.neutral.gray200,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 1,
    marginBottom: 20,
    padding: 16,
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
  },
  sectionHeader: {
    color: colors.neutral.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: colors.neutral.gray600,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputGroupLast: {
    marginBottom: 0,
  },
  inputLabel: {
    color: colors.neutral.gray700,
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  inputField: {
    backgroundColor: colors.neutral.gray50,
    borderColor: colors.neutral.gray200,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.neutral.text,
    fontSize: 15,
    fontWeight: '400',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputFieldError: {
    borderColor: colors.semantic.error,
  },
  errorText: {
    color: colors.semantic.error,
    fontSize: 11,
    marginTop: 5,
  },
});