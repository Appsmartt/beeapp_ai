import {
  FileText,
  Lock,
  Briefcase,
  Users,
  Calculator,
  Plane,
  UtensilsCrossed,
  Lightbulb,
  Home,
  GraduationCap,
  Heart,
  Star,
  Coffee,
  Music,
  Camera,
  ShoppingBag,
} from 'lucide-react-native';

/** Íconos de las categorías de notas, por clave guardada en el mock */
export const NOTE_CATEGORY_ICONS: Record<string, typeof FileText> = {
  'file-text': FileText,
  lock: Lock,
  briefcase: Briefcase,
  users: Users,
  calculator: Calculator,
  plane: Plane,
  'utensils-crossed': UtensilsCrossed,
  lightbulb: Lightbulb,
  home: Home,
  'graduation-cap': GraduationCap,
  heart: Heart,
  star: Star,
  coffee: Coffee,
  music: Music,
  camera: Camera,
  'shopping-bag': ShoppingBag,
};

export const getNoteCategoryIcon = (key: string) => NOTE_CATEGORY_ICONS[key] ?? FileText;
