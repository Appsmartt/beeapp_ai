import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import ScreenSafeArea from '../../src/components/layout/ScreenSafeArea';
import { useRouter } from 'expo-router';
import { colors } from '@beeapp/design-system';
import AboutYouSection from '../../src/components/onboarding/AboutYouSection';
import AssistantSection, { AssistantTone } from '../../src/components/onboarding/AssistantSection';
import FeaturesSection from '../../src/components/onboarding/FeaturesSection';
import { sharedStyles } from '../../src/components/onboarding/onboardingShared';

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1 States - About You
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [occupation, setOccupation] = useState('');
  const [address, setAddress] = useState('');
  const [hasPhoto, setHasPhoto] = useState(false);

  // Step 2 States - Assistant Customization
  const [assistantName, setAssistantName] = useState('BeeAI');
  const [tone, setTone] = useState<AssistantTone>('friendly');

  const handleNext = () => {
    if (step === 1) {
      if (!name.trim()) {
        alert('Por favor ingresa tu nombre completo para continuar.');
        return;
      }
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert('Por favor ingresa un correo electrónico válido.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!assistantName.trim()) {
        alert('Por favor ingresa un nombre para tu asistente.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      router.replace('/(main)');
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    } else {
      router.replace('/(auth)/login');
    }
  };

  // Assistant preview text generator
  const getAssistantPreviewText = () => {
    const userName = name.trim() ? name.split(' ')[0] : 'Usuario';
    const assName = assistantName.trim() ? assistantName : 'BeeAI';

    switch (tone) {
      case 'friendly':
        return `¡Hola, ${userName}! Qué gusto saludarte hoy. Soy ${assName}, tu asistente personal de confianza. ¿En qué te puedo colaborar el día de hoy?`;
      case 'professional':
        return `Estimado ${userName}, le saluda ${assName}. Quedo a su completa disposición para colaborar y optimizar sus actividades profesionales el día de hoy.`;
      case 'direct':
        return `${userName}. Le habla ${assName}. Indique la instrucción o consulta a ejecutar de inmediato para empezar a trabajar.`;
    }
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.innerContainer}>
            {/* Top Navigation & Progress */}
            <View style={styles.progressHeader}>
              <TouchableOpacity onPress={handleBack} style={styles.backNavButton}>
                <Text style={styles.backNavText}>← Atrás</Text>
              </TouchableOpacity>
              <Text style={styles.progressText}>Paso {step} de 3</Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressBar,
                    { width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' },
                  ]}
                />
              </View>
            </View>

            {/* Step Content */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {step === 1 && (
                <View style={sharedStyles.stepWrapper}>
                  <Text style={sharedStyles.title}>Vamos a conocerte</Text>
                  <Text style={sharedStyles.subtitle}>
                    Queremos conocerte para personalizar tu experiencia.
                  </Text>

                  <AboutYouSection
                    name={name}
                    onNameChange={setName}
                    email={email}
                    onEmailChange={setEmail}
                    occupation={occupation}
                    onOccupationChange={setOccupation}
                    address={address}
                    onAddressChange={setAddress}
                    hasPhoto={hasPhoto}
                    onTogglePhoto={() => setHasPhoto(!hasPhoto)}
                  />

                </View>
              )}

              {step === 2 && (
                <View style={sharedStyles.stepWrapper}>
                  <Text style={sharedStyles.title}>Personaliza tu asistente</Text>
                  <Text style={sharedStyles.subtitle}>
                    BeeApp AI incluye tu propio asistente inteligente para automatizar tus tareas diarias.
                  </Text>

                  <AssistantSection
                    assistantName={assistantName}
                    onAssistantNameChange={setAssistantName}
                    tone={tone}
                    onToneChange={setTone}
                    previewText={getAssistantPreviewText() ?? ''}
                  />
                </View>
              )}

              {step === 3 && (
                <View style={sharedStyles.stepWrapper}>
                  <Text style={sharedStyles.title}>Todo lo que puedes hacer aquí</Text>
                  <Text style={sharedStyles.subtitle}>
                    Familiarízate con las herramientas que potenciarán tu productividad.
                  </Text>

                  <FeaturesSection />
                </View>
              )}
            </ScrollView>

            {/* Bottom Actions */}
            <View style={styles.footerRow}>
              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.8}
                onPress={handleNext}
              >
                <Text style={styles.primaryButtonText}>
                  {step === 3 ? 'Comenzar' : 'Continuar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
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
  innerContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  progressHeader: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  backNavButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: colors.neutral.gray100,
    borderRadius: 8,
    marginBottom: 8,
  },
  backNavText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray700,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand.primary,
    marginBottom: 6,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.neutral.gray200,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.brand.primary,
    borderRadius: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  footerRow: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: colors.neutral.white,
    borderTopWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  primaryButton: {
    backgroundColor: colors.brand.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonText: {
    color: colors.neutral.white,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
