import { View, Text, TouchableOpacity } from 'react-native';
import {
    BriefcaseBusiness,
    ClipboardList,
    CalendarCheck2,
} from 'lucide-react-native';
import {
    BEE_SERVICES_QUICK_ACTIONS,
    BeeServicesQuickAction,
} from '../../mocks/beeServicesExplore';
import { styles } from './beeServicesStyles';

interface BeeServicesQuickActionsProps {
    onPressAction?: (action: BeeServicesQuickAction) => void;
}

const ACTION_ICONS = {
    requests: ClipboardList,
    orders: BriefcaseBusiness,
    reservations: CalendarCheck2,
};

export default function BeeServicesQuickActions({
    onPressAction,
    }: BeeServicesQuickActionsProps) {
    return (
        <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gestión Rápida</Text>

        <View style={styles.quickActionsRow}>
            {BEE_SERVICES_QUICK_ACTIONS.map((action) => {
            const Icon = ACTION_ICONS[action.id];

            return (
                <TouchableOpacity
                key={action.id}
                style={styles.quickActionCard}
                onPress={() => onPressAction?.(action)}
                activeOpacity={0.76}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                >
                <View style={styles.quickActionIconWrap}>
                    <Icon size={17} color="#7B2DD9" />
                </View>

                <Text style={styles.quickActionLabel}>{action.label}</Text>
                </TouchableOpacity>
            );
            })}
        </View>
        </View>
    );
}