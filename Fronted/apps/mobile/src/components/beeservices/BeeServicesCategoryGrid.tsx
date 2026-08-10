import { View, Text, TouchableOpacity } from 'react-native';
import {
    BriefcaseBusiness,
    Gavel,
    Scissors,
    Utensils,
} from 'lucide-react-native';
import {
    BEE_SERVICES_POPULAR_CATEGORIES,
    BeeServicesCategory,
} from '../../mocks/beeServicesExplore';
import { styles } from './beeServicesStyles';

interface BeeServicesCategoryGridProps {
    onPressCategory?: (category: BeeServicesCategory) => void;
}

const CATEGORY_ICONS = {
    briefcase: BriefcaseBusiness,
    utensils: Utensils,
    scissors: Scissors,
    gavel: Gavel,
};

export default function BeeServicesCategoryGrid({
    onPressCategory,
    }: BeeServicesCategoryGridProps) {
    return (
        <View style={styles.section}>
        <Text style={styles.sectionTitle}>Categorías Populares</Text>

        <View style={styles.categoryGrid}>
            {BEE_SERVICES_POPULAR_CATEGORIES.map((category) => {
            const Icon = CATEGORY_ICONS[category.icon];

            return (
                <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                onPress={() => onPressCategory?.(category)}
                activeOpacity={0.78}
                accessibilityRole="button"
                accessibilityLabel={`Categoría ${category.title}`}
                >
                <View style={styles.categoryIconWrap}>
                    <Icon size={21} color="#7B2DD9" />
                </View>

                <Text style={styles.categoryTitle}>{category.title}</Text>

                <Text style={styles.categorySubtitle}>
                    {category.subtitle}
                </Text>
                </TouchableOpacity>
            );
            })}
        </View>
        </View>
    );
}