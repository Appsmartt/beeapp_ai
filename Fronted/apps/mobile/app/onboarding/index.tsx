import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@beeapp/design-system';
import {
  getCurrentProfile,
  updateOnboardingProfile,
} from '@beeapp/api-client';
import type { UserProfile } from '@beeapp/shared-types';

import AboutYouSection from '../../src/components/onboarding/AboutYouSection';
import AssistantSection, {
  type AssistantTone,
} from '../../src/components/onboarding/AssistantSection';
import FeaturesSection from '../../src/components/onboarding/FeaturesSection';
import { sharedStyles } from '../../src/components/onboarding/onboardingShared';
import {
  getAuthSession,
} from '../../src/services/authSession';
import ScreenSafeArea from '../../src/components/layout/ScreenSafeArea';

type OnboardingStep = 'profile' | 'assistant' | 'features';

type ProfileErrors = {
  occupation?: string;
  location?: string;
};

function isProfileComplete(profile: UserProfile): boolean {
  return Boolean(
    profile.occupation?.trim() &&
      profile.location?.trim(),
  );
}

export default function OnboardingScreen() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentStep, setCurrentStep] =
    useState<OnboardingStep>('assistant');
  const [occupation, setOccupation] = useState('');
  const [location, setLocation] = useState('');
  const [profileErrors, setProfileErrors] =
    useState<ProfileErrors>({});
  const [assistantName, setAssistantName] = useState('BeeAI');
  const [tone, setTone] = useState<AssistantTone>('friendly');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [loadError, setLoadError] = useState('');

  const profileRequired = useMemo(
    () => (profile ? !isProfileComplete(profile) : false),
    [profile],
  );

  const totalSteps = profileRequired ? 3 : 2;

  const currentStepNumber = useMemo(() => {
    if (profileRequired) {
      if (currentStep === 'profile') {
        return 1;
      }

      if (currentStep === 'assistant') {
        return 2;
      }

      return 3;
    }

    if (currentStep === 'assistant') {
      return 1;
    }

    return 2;
  }, [currentStep, profileRequired]);

  const loadProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError('');

      const authSession = await getAuthSession();

      if (!authSession) {
        router.replace('/(auth)/login');
        return;
      }

      const response = await getCurrentProfile(
        authSession.session.access_token,
      );

      const currentProfile = response.profile;

      setProfile(currentProfile);
      setOccupation(currentProfile.occupation ?? '');
      setLocation(currentProfile.location ?? '');

      setCurrentStep(
        isProfileComplete(currentProfile)
          ? 'assistant'
          : 'profile',
      );
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'No fue posible cargar tu perfil.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const clearProfileError = (field: keyof ProfileErrors) => {
    setProfileErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined,
    }));
  };

  const getAssistantPreviewText = () => {
    const userName = profile?.first_name?.trim() || 'Usuario';
    const normalizedAssistantName = assistantName.trim() || 'BeeAI';

    switch (tone) {
      case 'friendly':
        return (
          `¡Hola, ${userName}! Qué gusto saludarte hoy. ` +
          `Soy ${normalizedAssistantName}, tu asistente personal. ` +
          '¿En qué te puedo colaborar?'
        );

      case 'professional':
        return (
          `Estimado ${userName}, le saluda ${normalizedAssistantName}. ` +
          'Quedo a su disposición para colaborar y optimizar sus actividades.'
        );

      case 'direct':
        return (
          `${userName}, le habla ${normalizedAssistantName}. ` +
          'Indique la instrucción o consulta para comenzar.'
        );
    }
  };

  const handleProfileContinue = async () => {
    const nextErrors: ProfileErrors = {};

    if (!occupation.trim()) {
      nextErrors.occupation =
        'Ingresa a qué te dedicas para continuar.';
    }

    if (!location.trim()) {
      nextErrors.location =
        'Ingresa tu ciudad o dirección para continuar.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setProfileErrors(nextErrors);
      return;
    }

    const authSession = await getAuthSession();

    if (!authSession) {
      router.replace('/(auth)/login');
      return;
    }

    try {
      setIsSavingProfile(true);
      setProfileErrors({});

      const response = await updateOnboardingProfile(
        authSession.session.access_token,
        {
          occupation: occupation.trim(),
          location: location.trim(),
        },
      );

      setProfile(response.profile);
      setCurrentStep('assistant');
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'No fue posible guardar tu información.',
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 'profile') {
      void handleProfileContinue();
      return;
    }

    if (currentStep === 'assistant') {
      if (!assistantName.trim()) {
        setLoadError(
          'Ingresa un nombre para tu asistente antes de continuar.',
        );
        return;
      }

      setLoadError('');
      setCurrentStep('features');
      return;
    }

    router.replace('/(main)');
  };

  const handleBack = () => {
    if (currentStep === 'features') {
      setCurrentStep('assistant');
      return;
    }

    if (currentStep === 'assistant' && profileRequired) {
      setCurrentStep('profile');
      return;
    }

    router.replace('/(auth)/login');
  };

  const handleRetry = () => {
    void loadProfile();
  };

  if (isLoading) {
    return (
      <ScreenState
        title="Preparando tu experiencia"
        description="Estamos revisando la información de tu perfil."
        loading
      />
    );
  }

  if (loadError && !profile) {
    return (
      <ScreenState
        title="No pudimos cargar tu perfil"
        description={loadError}
        actionLabel="Reintentar"
        onActionPress={handleRetry}
      />
    );
  }

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.innerContainer}>
            <View style={styles.progressHeader}>
              <TouchableOpacity
                onPress={handleBack}
                style={styles.backNavButton}
              >
                <Text style={styles.backNavText}>← Atrás</Text>
              </TouchableOpacity>

              <Text style={styles.progressText}>
                Paso {currentStepNumber} de {totalSteps}
              </Text>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${(
                        (currentStepNumber / totalSteps) *
                        100
                      ).toFixed(0)}%`,
                    },
                  ]}
                />
              </View>
            </View>

            {loadError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>
                  {loadError}
                </Text>
              </View>
            ) : null}

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {currentStep === 'profile' ? (
                <View style={sharedStyles.stepWrapper}>
                  <Text style={sharedStyles.title}>
                    Vamos a conocerte
                  </Text>

                  <Text style={sharedStyles.subtitle}>
                    Completa esta información para personalizar tu experiencia.
                  </Text>

                  <AboutYouSection
                    occupation={occupation}
                    onOccupationChange={(value) => {
                      setOccupation(value);
                      clearProfileError('occupation');
                    }}
                    location={location}
                    onLocationChange={(value) => {
                      setLocation(value);
                      clearProfileError('location');
                    }}
                    occupationError={profileErrors.occupation}
                    locationError={profileErrors.location}
                  />
                </View>
              ) : null}

              {currentStep === 'assistant' ? (
                <View style={sharedStyles.stepWrapper}>
                  <Text style={sharedStyles.title}>
                    Personaliza tu asistente
                  </Text>

                  <Text style={sharedStyles.subtitle}>
                    BeeApp AI incluye tu propio asistente inteligente para
                    automatizar tus tareas diarias.
                  </Text>

                  <AssistantSection
                    assistantName={assistantName}
                    onAssistantNameChange={(value) => {
                      setAssistantName(value);
                      setLoadError('');
                    }}
                    tone={tone}
                    onToneChange={setTone}
                    previewText={getAssistantPreviewText()}
                  />
                </View>
              ) : null}

              {currentStep === 'features' ? (
                <View style={sharedStyles.stepWrapper}>
                  <Text style={sharedStyles.title}>
                    Todo lo que puedes hacer aquí
                  </Text>

                  <Text style={sharedStyles.subtitle}>
                    Familiarízate con las herramientas que potenciarán tu
                    productividad.
                  </Text>

                  <FeaturesSection />
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.footerRow}>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  isSavingProfile && styles.primaryButtonDisabled,
                ]}
                activeOpacity={0.8}
                disabled={isSavingProfile}
                onPress={handleNext}
              >
                {isSavingProfile ? (
                  <ActivityIndicator color={colors.neutral.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {currentStep === 'features'
                      ? 'Comenzar'
                      : 'Continuar'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </ScreenSafeArea>
  );
}

interface ScreenStateProps {
  title: string;
  description: string;
  loading?: boolean;
  actionLabel?: string;
  onActionPress?: () => void;
}

function ScreenState({
  title,
  description,
  loading = false,
  actionLabel,
  onActionPress,
}: ScreenStateProps) {
  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.stateContainer}>
        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.brand.primary}
          />
        ) : null}

        <Text style={styles.stateTitle}>{title}</Text>

        <Text style={styles.stateDescription}>{description}</Text>

        {actionLabel && onActionPress ? (
          <TouchableOpacity
            style={styles.stateButton}
            activeOpacity={0.8}
            onPress={onActionPress}
          >
            <Text style={styles.stateButtonText}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
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
  innerContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  progressHeader: {
    backgroundColor: colors.neutral.white,
    borderBottomColor: colors.neutral.gray200,
    borderBottomWidth: 1,
    paddingBottom: 8,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  backNavButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.neutral.gray100,
    borderRadius: 8,
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  backNavText: {
    color: colors.neutral.gray700,
    fontSize: 12,
    fontWeight: '400',
  },
  progressText: {
    color: colors.brand.primary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  progressTrack: {
    backgroundColor: colors.neutral.gray200,
    borderRadius: 3,
    height: 6,
    overflow: 'hidden',
  },
  progressBar: {
    backgroundColor: colors.brand.primary,
    borderRadius: 3,
    height: '100%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  footerRow: {
    backgroundColor: colors.neutral.white,
    borderColor: colors.neutral.gray200,
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 14,
    elevation: 4,
    justifyContent: 'center',
    minHeight: 52,
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: colors.neutral.white,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderBottomColor: '#FECACA',
    borderBottomWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  errorBannerText: {
    color: colors.semantic.error,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  stateContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  stateTitle: {
    color: colors.neutral.text,
    fontSize: 21,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
  },
  stateDescription: {
    color: colors.neutral.gray600,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    textAlign: 'center',
  },
  stateButton: {
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  stateButtonText: {
    color: colors.neutral.white,
    fontSize: 14,
    fontWeight: '600',
  },
});