import {
  User, Users, Briefcase, Heart, Home, Star, GraduationCap,
  Coffee, Gamepad2, ShoppingBag, BookOpen, Music2, Plane,
  Palette, Leaf,
} from 'lucide-react-native';

/** Available category icons, kept in sync with backend validation. */
export const CATEGORY_ICONS = {
  User, Users, Briefcase, Heart, Home, Star, GraduationCap,
  Coffee, Gamepad2, ShoppingBag, BookOpen, Music2, Plane,
  Palette, Leaf,
};

export type CategoryIconName = keyof typeof CATEGORY_ICONS;

export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS) as CategoryIconName[];

/** Fall back safely if an older client receives an unknown icon. */
export const getCategoryIcon = (name: string) =>
  CATEGORY_ICONS[name as CategoryIconName] ?? Users;

/** Pastel colors, kept in sync with backend validation. */
export const CATEGORY_COLORS = [
  '#FFD6CC', '#FFE4C7', '#FFE8A8', '#FFF3B0', '#E4F4B2',
  '#BFEEDC', '#BFEDEB', '#CBE8FF', '#CDDFFF', '#DAD7FF',
  '#EAD7FF', '#F3D5F5', '#FFD5E8', '#FFD6D9', '#DFE7EE',
] as const;
