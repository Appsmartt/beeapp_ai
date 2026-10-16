import {
    ActivityIndicator,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Mic, Sparkles } from 'lucide-react-native';
import { colors } from '@beeapp/design-system';
import { styles } from './beeServicesStyles';

interface BeeServicesAiSearchCardProps {
    value: string;
    onChangeText: (value: string) => void;
    onSubmit: () => void;
    onPressVoice: () => void;
    listening?: boolean;
    busy?: boolean;
}

export default function BeeServicesAiSearchCard({
    value,
    onChangeText,
    onSubmit,
    onPressVoice,
    listening = false,
    busy = false,
}: BeeServicesAiSearchCardProps) {
    const voiceDisabled = busy;
    const status = busy
        ? 'Transcribiendo…'
        : listening
            ? 'Escuchando… toca el micrófono para buscar'
            : '';

    return (
        <View style={styles.aiSearchCard}>
            <View pointerEvents="none" style={styles.aiGlowLarge} />
            <View pointerEvents="none" style={styles.aiGlowSmall} />

            <Text style={styles.aiSearchTitle}>¿Qué necesitas hoy?</Text>

            <Text style={styles.aiSearchDescription}>
                Pregúntale a la IA para encontrar el servicio perfecto.
            </Text>

            <View style={styles.searchInputMock}>
                <View style={styles.sparkleIconWrap}>
                    <Sparkles size={18} color="#7C2DE0" />
                </View>

                <TextInput
                    accessibilityLabel="Pregúntale a la IA qué necesitas"
                    autoCapitalize="sentences"
                    editable={!listening && !busy}
                    multiline
                    onChangeText={onChangeText}
                    onSubmitEditing={onSubmit}
                    placeholder="Necesito un técnico en Montería..."
                    placeholderTextColor="#8B93A7"
                    returnKeyType="search"
                    blurOnSubmit
                    style={styles.searchInputField}
                    value={value}
                />

                <TouchableOpacity
                    accessibilityLabel={
                        listening
                            ? 'Detener y buscar por voz'
                            : 'Buscar mediante voz'
                    }
                    accessibilityRole="button"
                    accessibilityState={{
                        busy,
                        selected: listening,
                    }}
                    activeOpacity={0.78}
                    disabled={voiceDisabled}
                    onPress={onPressVoice}
                    style={[
                        styles.voiceButton,
                        listening && styles.voiceButtonListening,
                        voiceDisabled && { opacity: 0.7 },
                    ]}
                >
                    {busy ? (
                        <ActivityIndicator
                            color={colors.neutral.white}
                            size="small"
                        />
                    ) : (
                        <Mic size={17} color={colors.neutral.white} />
                    )}
                </TouchableOpacity>
            </View>

            {status ? (
                <Text
                    accessibilityLiveRegion="polite"
                    style={styles.aiSearchStatus}
                >
                    {status}
                </Text>
            ) : null}
        </View>
    );
}
