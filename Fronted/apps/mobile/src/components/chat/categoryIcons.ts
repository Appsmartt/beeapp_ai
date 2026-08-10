import { User, Users, Briefcase, Heart, Home, Star, GraduationCap, Coffee, Gamepad2 } from 'lucide-react-native';
import { colors } from '@beeapp/design-system';

/** Icons a category can wear, in the order the create sheet shows them */
export const CATEGORY_ICONS = {
  User,
  Users,
  Briefcase,
  Heart,
  Home,
  Star,
  GraduationCap,
  Coffee,
  Gamepad2,
};

export type CategoryIconName = keyof typeof CATEGORY_ICONS;

export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS) as CategoryIconName[];

/** Falls back to Users when a category carries an unknown icon name */
export const getCategoryIcon = (name: string) =>
  CATEGORY_ICONS[name as CategoryIconName] ?? Users;

/** Chip backgrounds offered when creating a category */
export const CATEGORY_COLORS = [
  '#EBF5FF',
  '#FCE7F3',
  '#ECFDF5',
  '#FEF3C7',
  '#F3E8FF',
  colors.neutral.gray100,
];
