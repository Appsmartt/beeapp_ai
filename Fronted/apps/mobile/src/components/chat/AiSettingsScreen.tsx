import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import ScreenSafeArea from '../layout/ScreenSafeArea';
import { colors, spacing, radii } from '@beeapp/design-system';
import { ChevronLeft, Bot, Smile, Briefcase, Minus, Check } from 'lucide-react-native';
import { useModuleNav } from '../embedded/EmbeddedNavContext';
import FloatingTabBar from '../FloatingTabBar';
import {
    clearAssistantMemory,
    getAssistantSettings,
    saveAssistantSettings,
} from '@beeapp/api-client';
import type { AssistantLevel, AssistantPermissions, AssistantTone } from '@beeapp/shared-types';
import { getValidSessionCredentials } from '../../services/authSession';

const TONES: { id: AssistantTone; label: string; desc: string; icon: typeof Smile }[] = [
    { id: 'formal', label: 'Formal', desc: 'Trato de usted, preciso.', icon: Briefcase },
    { id: 'cercano', label: 'Cercano', desc: 'Tutea, con calidez.', icon: Smile },
    { id: 'neutro', label: 'Neutro', desc: 'Claro y sin adornos.', icon: Minus },
];

const VOICES = [
    { id: 'alloy', label: 'Clara' },
    { id: 'nova', label: 'Brillante' },
    { id: 'shimmer', label: 'Suave' },
    { id: 'echo', label: 'Grave' },
    { id: 'onyx', label: 'Profunda' },
    { id: 'fable', label: 'Narrativa' },
];

const LEVELS: { id: AssistantLevel; label: string }[] = [
    { id: 'sugerir', label: 'Sugerir' },
    { id: 'confirmar', label: 'Confirmar' },
    { id: 'automatico', label: 'Automático' },
];

const LANGUAGES = [
    { id: 'es', label: 'Español' },
    { id: 'en', label: 'Inglés' },
    { id: 'pt', label: 'Portugués' },
];

const PERMISSIONS: { id: keyof AssistantPermissions; label: string }[] = [
    { id: 'calendar', label: 'Agenda' },
    { id: 'notes', label: 'Notas' },
    { id: 'mail', label: 'Correo' },
    { id: 'marketplace', label: 'Buddy Services' },
    { id: 'send_messages', label: 'Enviar mensajes' },
];

const DEFAULT_PERMISSIONS: AssistantPermissions = {
    calendar: true,
    notes: true,
    mail: true,
    marketplace: true,
    send_messages: true,
};

export default function AiSettingsScreen() {
    const router = useModuleNav();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState('Buddy AI');
    const [tone, setTone] = useState<AssistantTone>('neutro');
    const [voice, setVoice] = useState('alloy');
    const [language, setLanguage] = useState('es');
    const [voiceActivation, setVoiceActivation] = useState(false);
    const [level, setLevel] = useState<AssistantLevel>('confirmar');
    const [memoryEnabled, setMemoryEnabled] = useState(true);
    const [permissions, setPermissions] = useState<AssistantPermissions>(DEFAULT_PERMISSIONS);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            const auth = await getValidSessionCredentials();
            if (!auth || auth.scheme !== 'Bearer') {
                setLoading(false);
                return;
            }
            const response = await getAssistantSettings(auth);
            if (cancelled) return;
            const settings = response.settings;
            setName(settings.name);
            setTone(settings.tone);
            setVoice(settings.voice);
            setLanguage(settings.language);
            setVoiceActivation(settings.voice_activation);
            setLevel(settings.assistance_level);
            setMemoryEnabled(settings.memory_enabled);
            setPermissions(settings.permissions);
            setLoading(false);
        };
        load().catch((error) => {
            setLoading(false);
            Alert.alert('Asistente', error instanceof Error ? error.message : 'No se pudo cargar la configuración.');
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const handleSave = async () => {
        const auth = await getValidSessionCredentials();
        if (!auth || auth.scheme !== 'Bearer') return;
        setSaving(true);
        try {
            await saveAssistantSettings(auth, {
                name: name.trim() || 'Buddy AI',
                tone,
                voice,
                language,
                voice_activation: voiceActivation,
                assistance_level: level,
                memory_enabled: memoryEnabled,
                permissions,
            });
            Alert.alert('Cambios guardados', 'La configuración de tu asistente quedó guardada.');
            router.back();
        } catch (error) {
            Alert.alert('Asistente', error instanceof Error ? error.message : 'No se pudo guardar.');
        } finally {
            setSaving(false);
        }
    };

    const clearMemory = async () => {
        const auth = await getValidSessionCredentials();
        if (!auth || auth.scheme !== 'Bearer') return;
        try {
            await clearAssistantMemory(auth);
            Alert.alert('Memoria', 'Borré lo que el asistente recordaba de ti.');
        } catch (error) {
            Alert.alert('Memoria', error instanceof Error ? error.message : 'No se pudo borrar la memoria.');
        }
    };

    return (
        <ScreenSafeArea style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                        <ChevronLeft size={24} color={colors.neutral.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Configuración del Asistente</Text>
                    <View style={{ width: 32 }} />
                </View>

                {loading ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.brand.primary} /> : (
                    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
                        <View style={styles.hero}>
                            <View style={styles.avatar}>
                                <Bot size={34} color={colors.neutral.white} />
                            </View>
                            <Text style={styles.heroName}>{name || 'Tu asistente'}</Text>
                            <Text style={styles.heroDesc}>
                                Los textos que le pides procesar se envían a OpenAI para responder y actuar.
                            </Text>
                        </View>

                        <Text style={styles.label}>Nombre del asistente</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            maxLength={40}
                            placeholder="Ej. Buddy AI"
                            placeholderTextColor={colors.neutral.gray500}
                        />

                        <Text style={styles.label}>Tono de trato</Text>
                        {TONES.map((item) => {
                            const active = tone === item.id;
                            const Icon = item.icon;
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[styles.toneCard, active && styles.toneCardActive]}
                                    onPress={() => setTone(item.id)}
                                    activeOpacity={0.8}
                                >
                                    <View style={[styles.toneIcon, active && styles.toneIconActive]}>
                                        <Icon size={18} color={active ? colors.brand.primary : colors.neutral.gray600} />
                                    </View>
                                    <View style={styles.toneTexts}>
                                        <Text style={[styles.toneTitle, active && styles.toneTitleActive]}>{item.label}</Text>
                                        <Text style={styles.toneDesc}>{item.desc}</Text>
                                    </View>
                                    {active && <Check size={16} color={colors.brand.primary} />}
                                </TouchableOpacity>
                            );
                        })}

                        <Text style={styles.label}>Voz</Text>
                        <View style={styles.chipsRow}>
                            {VOICES.map((item) => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[styles.chip, voice === item.id && styles.chipActive]}
                                    onPress={() => setVoice(item.id)}
                                >
                                    <Text style={[styles.chipText, voice === item.id && styles.chipTextActive]}>{item.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Idioma preferido</Text>
                        <View style={styles.chipsRow}>
                            {LANGUAGES.map((item) => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[styles.chip, language === item.id && styles.chipActive]}
                                    onPress={() => setLanguage(item.id)}
                                >
                                    <Text style={[styles.chipText, language === item.id && styles.chipTextActive]}>{item.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Activación por voz</Text>
                        <TouchableOpacity
                            style={[styles.toneCard, voiceActivation && styles.toneCardActive]}
                            onPress={() => setVoiceActivation((value) => !value)}
                        >
                            <View style={styles.toneTexts}>
                                <Text style={styles.toneTitle}>Tocar para hablar</Text>
                                <Text style={styles.toneDesc}>Al abrir el asistente de voz, empieza a escuchar. No hay palabra clave permanente.</Text>
                            </View>
                            {voiceActivation && <Check size={16} color={colors.brand.primary} />}
                        </TouchableOpacity>

                        <Text style={styles.label}>Nivel de asistencia</Text>
                        <View style={styles.chipsRow}>
                            {LEVELS.map((item) => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[styles.chip, level === item.id && styles.chipActive]}
                                    onPress={() => setLevel(item.id)}
                                >
                                    <Text style={[styles.chipText, level === item.id && styles.chipTextActive]}>{item.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Memoria</Text>
                        <TouchableOpacity
                            style={[styles.toneCard, memoryEnabled && styles.toneCardActive]}
                            onPress={() => setMemoryEnabled((value) => !value)}
                        >
                            <View style={styles.toneTexts}>
                                <Text style={styles.toneTitle}>Recordar contexto</Text>
                                <Text style={styles.toneDesc}>Guarda datos que le pidas recordar.</Text>
                            </View>
                            {memoryEnabled && <Check size={16} color={colors.brand.primary} />}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.secondaryBtn} onPress={() => void clearMemory()}>
                            <Text style={styles.secondaryBtnText}>Borrar memoria</Text>
                        </TouchableOpacity>

                        <Text style={styles.label}>Permisos</Text>
                        {PERMISSIONS.map((item) => {
                            const active = permissions[item.id];
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[styles.toneCard, active && styles.toneCardActive]}
                                    onPress={() => setPermissions((current) => ({ ...current, [item.id]: !current[item.id] }))}
                                >
                                    <Text style={styles.toneTitle}>{item.label}</Text>
                                    {active && <Check size={16} color={colors.brand.primary} />}
                                </TouchableOpacity>
                            );
                        })}

                        <TouchableOpacity style={styles.saveBtn} onPress={() => void handleSave()} disabled={saving} activeOpacity={0.85}>
                            <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : 'Guardar cambios'}</Text>
                        </TouchableOpacity>
                        <View style={{ height: 120 }} />
                    </ScrollView>
                )}
                {!router.embedded && <FloatingTabBar />}
            </View>
        </ScreenSafeArea>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.neutral.gray50 },
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: colors.neutral.white,
        borderBottomWidth: 1,
        borderColor: colors.neutral.gray100,
    },
    backBtn: { padding: 4 },
    headerTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.neutral.text, textAlign: 'center' },
    body: { paddingHorizontal: spacing.md, paddingTop: spacing.lg },
    hero: { alignItems: 'center', marginBottom: spacing.lg },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: colors.brand.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    heroName: { fontSize: 17, fontWeight: '600', color: colors.neutral.text },
    heroDesc: { fontSize: 12, color: colors.neutral.gray600, textAlign: 'center', marginTop: 4, lineHeight: 17 },
    label: {
        fontSize: 11,
        color: colors.neutral.gray600,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        marginBottom: spacing.sm,
        marginTop: spacing.md,
    },
    input: {
        backgroundColor: colors.neutral.white,
        borderWidth: 1,
        borderColor: colors.neutral.gray200,
        borderRadius: radii.lg,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        color: colors.neutral.text,
    },
    toneCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.neutral.white,
        borderWidth: 1,
        borderColor: colors.neutral.gray200,
        borderRadius: radii.xl,
        padding: 12,
        marginBottom: spacing.sm,
    },
    toneCardActive: { borderColor: colors.brand.primary, backgroundColor: colors.brand.primary + '08' },
    toneIcon: {
        width: 36,
        height: 36,
        borderRadius: radii.lg,
        backgroundColor: colors.neutral.gray100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toneIconActive: { backgroundColor: colors.brand.primary + '15' },
    toneTexts: { flex: 1 },
    toneTitle: { flex: 1, fontSize: 13.5, color: colors.neutral.text },
    toneTitleActive: { color: colors.brand.primary, fontWeight: '600' },
    toneDesc: { fontSize: 11.5, color: colors.neutral.gray600, marginTop: 2 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: radii.lg,
        backgroundColor: colors.neutral.white,
        borderWidth: 1,
        borderColor: colors.neutral.gray200,
    },
    chipActive: { backgroundColor: colors.brand.primary + '15', borderColor: colors.brand.primary },
    chipText: { fontSize: 12.5, color: colors.neutral.gray700 },
    chipTextActive: { color: colors.brand.primary, fontWeight: '600' },
    secondaryBtn: {
        borderWidth: 1,
        borderColor: colors.neutral.gray200,
        borderRadius: radii.xl,
        paddingVertical: 12,
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    secondaryBtnText: { color: colors.neutral.text, fontWeight: '600' },
    saveBtn: {
        backgroundColor: colors.brand.primary,
        borderRadius: radii.xl,
        paddingVertical: 15,
        alignItems: 'center',
        marginTop: spacing.lg,
    },
    saveBtnText: { color: colors.neutral.white, fontSize: 14, fontWeight: '600' },
});
