import {
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BriefcaseBusiness,
  CircleHelp,
  Gavel,
  Scissors,
  ShoppingBag,
  Utensils,
} from 'lucide-react-native';

import type {
  CommercialCategory,
} from '@beeapp/shared-types';

import {
  styles,
} from '../beeservices/beeServicesStyles';

interface CommercialCategoryGridProps {
  categories: CommercialCategory[];
  disabled?: boolean;
  onPressCategory: (
    category: CommercialCategory,
  ) => void;
}

function getCategoryIcon(
  category: CommercialCategory,
) {
  const normalized = [
    category.name,
    category.slug,
  ]
    .join(' ')
    .toLowerCase();

  if (
    normalized.includes('comida')
    || normalized.includes('restaurante')
    || normalized.includes('aliment')
    || normalized.includes('food')
  ) {
    return Utensils;
  }

  if (
    normalized.includes('belleza')
    || normalized.includes('salón')
    || normalized.includes('salon')
    || normalized.includes('barber')
  ) {
    return Scissors;
  }

  if (
    normalized.includes('legal')
    || normalized.includes('abogado')
    || normalized.includes('juríd')
    || normalized.includes('jurid')
  ) {
    return Gavel;
  }

  if (
    normalized.includes('tienda')
    || normalized.includes('producto')
    || normalized.includes('comercio')
  ) {
    return ShoppingBag;
  }

  if (
    normalized.includes('servicio')
    || normalized.includes('profesional')
    || normalized.includes('negocio')
  ) {
    return BriefcaseBusiness;
  }

  return CircleHelp;
}

function getSubtitle(
  category: CommercialCategory,
): string {
  if (category.offer_type === 'products') {
    return 'Productos';
  }

  if (category.offer_type === 'services') {
    return 'Servicios';
  }

  return 'Productos y servicios';
}

export default function CommercialCategoryGrid({
  categories,
  disabled = false,
  onPressCategory,
}: CommercialCategoryGridProps) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        Categorías populares
      </Text>

      <View style={styles.categoryGrid}>
        {categories.map((category) => {
          const Icon = getCategoryIcon(category);

          return (
            <TouchableOpacity
              key={category.id}
              accessibilityLabel={
                `Explorar categoría ${category.name}`
              }
              accessibilityRole="button"
              activeOpacity={0.78}
              disabled={disabled}
              onPress={() => onPressCategory(category)}
              style={[
                styles.categoryCard,
                disabled && {
                  opacity: 0.6,
                },
              ]}
            >
              <View style={styles.categoryIconWrap}>
                <Icon
                  color="#7B2DD9"
                  size={21}
                />
              </View>

              <Text
                numberOfLines={2}
                style={styles.categoryTitle}
              >
                {category.name}
              </Text>

              <Text style={styles.categorySubtitle}>
                {getSubtitle(category)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
