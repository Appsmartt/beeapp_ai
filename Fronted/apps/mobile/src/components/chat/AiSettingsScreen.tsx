import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import ScreenSafeArea from '../layout/ScreenSafeArea';
import { colors, spacing, radii } from '@beeapp/design-system';
import { ChevronLeft, Bot, Smile, Briefcase, Zap, Sparkles, Check } from 'lucide-react-native';
import { useModuleNav } from '../embedded/EmbeddedNavContext';
import FloatingTabBar from '../FloatingTabBar';
import { AI_ASSISTANT_NAME } from '../../mocks/chats';

type Tone = 'profesional' | 'amigable' | 'directo' | 'creativo';

const TONES: { id: Tone; label: string; desc: string; icon: typeof Smile }[] = [
  { id: 'profesional', label: 'Profesional', desc: 'Respuestas formales y precisas.', icon: Briefcase },
  { id: 'amigable', label: 'Amigable', desc: 'Trato cercano y con calidez.', icon: Smile },
  { id: 'directo', label: 'Directo', desc: 'Al grano, sin rodeos.', icon: Zap },
  { id: 'creativo', label: 'Creativo', desc: 'Propone ideas y alternativas.', icon: Sparkles },
];

const LANGUAGES = ['Español', 'Inglés', 'Portugués'];

/**
 * Assistant settings (name, tone and language). Reached only from the header
 * of the pinned AI chat. Everything is mock: nothing is persisted.
 */
export default function AiSettingsScreen() {
  const router = useModuleNav();
  const [name, setName] = useState(AI_ASSISTANT_NAME);
  const [tone, setTone] = useState<Tone>('amigable');
  const [language, setLanguage] = useState('Español');

  const handleSave = () => {
    Alert.alert('Cambios guardados', 'La configuración de tu asistente se actualizó (simulación).');
    router.back();
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

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.avatar}>
              <Bot size={34} color={colors.neutral.white} />
            </View>
            <Text style={styles.heroName}>{name || 'Tu asistente'}</Text>
            <Text style={styles.heroDesc}>
              Así se presenta y responde tu asistente dentro del chat.
            </Text>
          </View>

          <Text style={styles.label}>Nombre del asistente</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Ej. Bee, Colmena, Asistente..."
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

          <Text style={styles.label}>Idioma preferido</Text>
          <View style={styles.chipsRow}>
            {LANGUAGES.map((lang) => {
              const active = language === lang;
              return (
                <TouchableOpacity
                  key={lang}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setLanguage(lang)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{lang}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
            <Text style={styles.saveBtnText}>Guardar cambios</Text>
          </TouchableOpacity>

          <View style={{ height: 120 }} />
        </ScrollView>

        {!router.embedded && <FloatingTabBar />}
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.gray50,
  },
  container: {
    flex: 1,
  },
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
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral.text,
    textAlign: 'center',
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  heroName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  heroDesc: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray600,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
  },
  label: {
    fontSize: 11,
    fontWeight: '400',
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
    fontWeight: '400',
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
  toneCardActive: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.primary + '08',
  },
  toneIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.lg,
    backgroundColor: colors.neutral.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toneIconActive: {
    backgroundColor: colors.brand.primary + '15',
  },
  toneTexts: {
    flex: 1,
  },
  toneTitle: {
    fontSize: 13.5,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  toneTitleActive: {
    color: colors.brand.primary,
    fontWeight: '600',
  },
  toneDesc: {
    fontSize: 11.5,
    fontWeight: '400',
    color: colors.neutral.gray600,
    marginTop: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.lg,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  chipActive: {
    backgroundColor: colors.brand.primary + '15',
    borderColor: colors.brand.primary,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '400',
    color: colors.neutral.gray700,
  },
  chipTextActive: {
    color: colors.brand.primary,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: radii.xl,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveBtnText: {
    color: colors.neutral.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
