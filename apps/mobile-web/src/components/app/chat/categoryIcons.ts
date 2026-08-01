import {
  User,
  Users,
  Briefcase,
  Heart,
  Home,
  Star,
  GraduationCap,
  Coffee,
  Gamepad2,
  Wrench,
  Package,
  Tag,
  Folder,
  MessageSquare,
  Sparkles,
  LucideIcon,
} from 'lucide-react';

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  User,
  Users,
  Briefcase,
  Heart,
  Home,
  Star,
  GraduationCap,
  Coffee,
  Gamepad2,
  Wrench,
  Package,
  Tag,
  Folder,
  MessageSquare,
  Sparkles,
};

export const CATEGORY_ICON_NAMES = [
  'Users',
  'Briefcase',
  'Heart',
  'Home',
  'Star',
  'GraduationCap',
  'Coffee',
  'Gamepad2',
] as const;

export type CategoryIconName = (typeof CATEGORY_ICON_NAMES)[number];

export const CATEGORY_COLORS = [
  '#EBF5FF',
  '#F1F3F5',
  '#FCE7F3',
  '#ECFDF5',
  '#FEF3C7',
  '#F3E8FF',
  '#FFF1F2',
];

export function getCategoryIcon(name: string): LucideIcon {
  return CATEGORY_ICONS[name] ?? Folder;
}
