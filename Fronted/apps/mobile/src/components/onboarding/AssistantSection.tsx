
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '@beeapp/design-system';
import { Smile, Briefcase, Zap, Bot } from 'lucide-react-native';
import { sharedStyles } from './onboardingShared';

export type AssistantTone = 'friendly' | 'professional' | 'direct';

interface AssistantSectionProps {
  assistantName: string;
  onAssistantNameChange: (value: string) => void;
  tone: AssistantTone;
  onToneChange: (value: AssistantTone) => void;
  previewText: string;
}

export default function AssistantSection({
  assistantName,
  onAssistantNameChange,
  tone,
  onToneChange,
  previewText,
}: AssistantSectionProps) {
  return (
    <>
      {/* Assistant custom Card */}
      <View style={sharedStyles.sectionCard}>
        <View style={sharedStyles.inputGroup}>
          <Text style={sharedStyles.inputLabel}>Nombre del Asistente *</Text>
          <TextInput
            style={sharedStyles.inputField}
            placeholder="Ej. BeeAI, Colmena, Asistente..."
            placeholderTextColor={colors.neutral.gray500}
            value={assistantName}
            onChangeText={onAssistantNameChange}
          />
        </View>

        {/* Tone Selectors */}
        <View style={sharedStyles.inputGroup}>
          <Text style={sharedStyles.inputLabel}>Tono de Trato del Asistente</Text>

          <TouchableOpacity
            style={[styles.toneCard, tone === 'friendly' && styles.toneCardActive]}
            onPress={() => onToneChange('friendly')}
            activeOpacity={0.8}
          >
            <View style={styles.toneIconWrap}>
              <Smile size={20} color={colors.brand.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toneTitle, tone === 'friendly' && styles.toneTitleActive]}>Amable</Text>
              <Text style={styles.toneDesc}>Trato empático, cercano y con calidez en sus saludos.</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toneCard, tone === 'professional' && styles.toneCardActive]}
            onPress={() => onToneChange('professional')}
            activeOpacity={0.8}
          >
            <View style={styles.toneIconWrap}>
              <Briefcase size={20} color={colors.brand.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toneTitle, tone === 'professional' && styles.toneTitleActive]}>Serio</Text>
              <Text style={styles.toneDesc}>Trato formal, profesional y enfocado en tareas empresariales.</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toneCard, tone === 'direct' && styles.toneCardActive]}
            onPress={() => onToneChange('direct')}
            activeOpacity={0.8}
          >
            <View style={styles.toneIconWrap}>
              <Zap size={20} color={colors.brand.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toneTitle, tone === 'direct' && styles.toneTitleActive]}>Directo</Text>
              <Text style={styles.toneDesc}>Trato conciso, al grano, optimizando la velocidad y respuestas.</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Realtime Chat Preview Bubble */}
      <View style={styles.previewBox}>
        <Text style={styles.previewBoxLabel}>Vista previa del trato del asistente</Text>
        <View style={styles.chatBubbleContainer}>
          <View style={styles.botIcon}>
            <Bot size={18} color={colors.neutral.gray600} />
          </View>
          <View style={styles.chatBubble}>
            <Text style={styles.chatBubbleText}>{previewText}</Text>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  toneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: colors.neutral.gray50,
    borderWidth: 1.5,
    borderColor: colors.neutral.gray200,
    borderRadius: 12,
    marginBottom: 10,
  },
  toneCardActive: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.neutral.white,
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  toneIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  toneTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral.text,
    marginBottom: 2,
  },
  toneTitleActive: {
    color: colors.brand.primary,
    fontWeight: '600',
  },
  toneDesc: {
    fontSize: 11,
    color: colors.neutral.gray600,
    lineHeight: 15,
  },
  previewBox: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  previewBoxLabel: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  chatBubbleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  botIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.neutral.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  chatBubble: {
    flex: 1,
    backgroundColor: colors.brand.primary + '15',
    borderRadius: 14,
    borderBottomLeftRadius: 2,
    padding: 12,
  },
  chatBubbleText: {
    fontSize: 13,
    color: colors.neutral.text,
    lineHeight: 18,
    fontWeight: '400',
  },
});
