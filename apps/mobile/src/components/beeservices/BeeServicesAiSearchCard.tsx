import { View, Text, TouchableOpacity } from 'react-native';
import { Mic, Sparkles } from 'lucide-react-native';
import { colors } from '@beeapp/design-system';
import { styles } from './beeServicesStyles';

interface BeeServicesAiSearchCardProps {
    onPressVoice?: () => void;
    onPressSearch?: () => void;
}

export default function BeeServicesAiSearchCard({
    onPressVoice,
    onPressSearch,
    }: BeeServicesAiSearchCardProps) {
    return (
        <View style={styles.aiSearchCard}>
        <View pointerEvents="none" style={styles.aiGlowLarge} />
        <View pointerEvents="none" style={styles.aiGlowSmall} />

        <Text style={styles.aiSearchTitle}>¿Qué necesitas hoy?</Text>

        <Text style={styles.aiSearchDescription}>
            Pregúntale a la IA para encontrar el servicio perfecto.
        </Text>

        <TouchableOpacity
            style={styles.searchInputMock}
            onPress={onPressSearch}
            activeOpacity={0.86}
        >
            <View style={styles.sparkleIconWrap}>
            <Sparkles size={18} color="#7C2DE0" />
            </View>

            <Text style={styles.searchInputText}>
            Necesito un técnico en{'\n'}Montería...
            </Text>

            <TouchableOpacity
            style={styles.voiceButton}
            onPress={onPressVoice}
            activeOpacity={0.78}
            accessibilityRole="button"
            accessibilityLabel="Buscar mediante voz"
            >
            <Mic size={17} color={colors.neutral.white} />
            </TouchableOpacity>
        </TouchableOpacity>
        </View>
    );
}