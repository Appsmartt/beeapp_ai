import { colors } from '../tokens/colors';
import { typography } from '../tokens/typography';

export const lightTheme = {
  background: {
    primary: colors.brand.primary, // #6025d2
    dark: colors.brand.dark,       // #5B2CD9
    white: colors.neutral.white,
    secondary: colors.neutral.gray50,
  },
  text: {
    primary: colors.brand.textPrimary, // #1A1A2E
    white: colors.neutral.white,
    secondary: colors.neutral.gray600,
    muted: 'rgba(255, 255, 255, 0.75)',
  },
  border: {
    default: colors.neutral.gray200,
    subtle: colors.neutral.gray100,
  },
  brand: colors.brand,
  semantic: colors.semantic,
  typography,
};
