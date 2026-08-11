~/Git/beeapp_ai/Backend/beeAppBack/apps/accounts/views.py
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.exceptions import (
    AccountLoginError,
    AccountRegistrationError,
)
from apps.accounts.serializers import (
    LoginUserSerializer,
    RegisterUserSerializer,
)
from apps.accounts.services.login_service import (
    login_with_email_password,
)
from apps.accounts.services.registration_service import (
    create_complete_user,
)


class RegisterUserView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            created_user = create_complete_user(
                **serializer.validated_data
            )

        except AccountRegistrationError:
            return Response(
                {
                    "detail": (
                        "Could not create the account. "
                        "The email or phone number may already be registered."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": "BeeApp account created successfully.",
                "user": {
                    "id": created_user["auth_user_id"],
                    "email": created_user["email"],
                    "phone": created_user["phone"],
                    "first_name": created_user["profile"]["first_name"],
                    "last_name": created_user["profile"]["last_name"],
                    "phone_dial_code": created_user["profile"][
                        "phone_dial_code"
                    ],
                    "phone_number": created_user["profile"][
                        "phone_number"
                    ],
                    "role": created_user["profile"]["role"],
                },
            },
            status=status.HTTP_201_CREATED,
        )


class LoginUserView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            authenticated_user = login_with_email_password(
                **serializer.validated_data
            )

        except AccountLoginError:
            return Response(
                {
                    "detail": "Invalid email or password.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        return Response(
            {
                "message": "Login successful.",
                "session": authenticated_user["session"],
                "user": authenticated_user["user"],
            },
            status=status.HTTP_200_OK,
        )

~/Git/beeapp_ai/Backend/beeAppBack/apps/accounts/serializers.py
from rest_framework import serializers


class RegisterUserSerializer(serializers.Serializer):
    first_name = serializers.CharField(
        max_length=100,
        trim_whitespace=True,
    )
    last_name = serializers.CharField(
        max_length=100,
        trim_whitespace=True,
    )
    email = serializers.EmailField()
    password = serializers.CharField(
        min_length=8,
        max_length=128,
        write_only=True,
        trim_whitespace=False,
    )
    phone_dial_code = serializers.CharField(
        max_length=10,
        trim_whitespace=True,
    )
    phone_number = serializers.CharField(
        max_length=20,
        trim_whitespace=True,
    )

    def validate_email(self, value: str) -> str:
        return value.strip().lower()

    def validate_phone_dial_code(self, value: str) -> str:
        normalized_value = value.replace("+", "").replace(" ", "")

        if not normalized_value.isdigit():
            raise serializers.ValidationError(
                "Phone dial code must contain only digits."
            )

        return normalized_value

    def validate_phone_number(self, value: str) -> str:
        normalized_value = (
            value.replace(" ", "")
            .replace("-", "")
            .replace("(", "")
            .replace(")", "")
        )

        if not normalized_value.isdigit():
            raise serializers.ValidationError(
                "Phone number must contain only digits."
            )

        return normalized_value


class LoginUserSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(
        min_length=8,
        max_length=128,
        write_only=True,
        trim_whitespace=False,
    )

    def validate_email(self, value: str) -> str:
        return value.strip().lower()

~/Git/beeapp_ai/Backend/beeAppBack/apps/accounts/urls.py
from django.urls import path

from apps.accounts.views import (
    LoginUserView,
    RegisterUserView,
)


urlpatterns = [
    path("register/", RegisterUserView.as_view(), name="register-user"),
    path("login/", LoginUserView.as_view(), name="login-user"),
]

~/Git/beeapp_ai/Backend/beeAppBack/apps/accounts/exceptions.py
class AccountError(Exception):
    """Base exception for account domain errors."""


class AccountRegistrationError(AccountError):
    """Raised when account registration fails."""


class AuthUserCreationError(AccountRegistrationError):
    """Raised when Supabase Auth user creation fails."""


class ProfileCreationError(AccountRegistrationError):
    """Raised when BeeApp profile creation fails."""


class AccountLoginError(AccountError):
    """Raised when email and password authentication fails."""

~/Git/beeapp_ai/Backend/beeAppBack/apps/accounts/services/profile_service.py
from beeAppBack.core.supabase_client import get_supabase_admin_client

from apps.accounts.exceptions import ProfileCreationError


def create_profile(
    *,
    auth_user_id: str,
    first_name: str,
    last_name: str,
    phone_dial_code: str,
    phone_number: str,
):
    try:
        supabase = get_supabase_admin_client()

        response = (
            supabase.table("profile")
            .insert(
                {
                    "id": auth_user_id,
                    "first_name": first_name,
                    "last_name": last_name,
                    "phone_dial_code": phone_dial_code,
                    "phone_number": phone_number,
                    "role": "USER",
                }
            )
            .execute()
        )

        if not response.data:
            raise ProfileCreationError(
                "Supabase did not return the created profile."
            )

        return response.data[0]

    except ProfileCreationError:
        raise

    except Exception as error:
        raise ProfileCreationError(
            "Could not create the BeeApp profile."
        ) from error


~/Git/beeapp_ai/Backend/beeAppBack/apps/accounts/services/login_service.py
from beeAppBack.core.supabase_client import get_supabase_publishable_client

from apps.accounts.exceptions import AccountLoginError


def login_with_email_password(
    *,
    email: str,
    password: str,
) -> dict:
    try:
        supabase = get_supabase_publishable_client()

        response = supabase.auth.sign_in_with_password(
            {
                "email": email,
                "password": password,
            }
        )

        if not response.user or not response.session:
            raise AccountLoginError(
                "Supabase did not return an authenticated session."
            )

        session = response.session
        user = response.user

        if not session.access_token or not session.refresh_token:
            raise AccountLoginError(
                "Supabase did not return valid session tokens."
            )

        return {
            "session": {
                "access_token": session.access_token,
                "refresh_token": session.refresh_token,
                "expires_at": session.expires_at,
                "expires_in": session.expires_in,
                "token_type": session.token_type,
            },
            "user": {
                "id": str(user.id),
                "email": user.email,
                "phone": user.phone,
            },
        }

    except AccountLoginError:
        raise

    except Exception as error:
        raise AccountLoginError(
            "Email and password authentication failed."
        ) from error

~/Git/beeapp_ai/Backend/beeAppBack/apps/accounts/services/auth_user_service.py
from beeAppBack.core.supabase_client import get_supabase_admin_client

from apps.accounts.exceptions import AuthUserCreationError


def create_auth_user(
    *,
    email: str,
    password: str,
    phone_dial_code: str,
    phone_number: str,
):
    phone = f"+{phone_dial_code}{phone_number}"

    try:
        supabase = get_supabase_admin_client()

        response = supabase.auth.admin.create_user(
            {
                "email": email,
                "password": password,
                "phone": phone,
                "email_confirm": True,
                "phone_confirm": True,
            }
        )

        if not response.user:
            raise AuthUserCreationError(
                "Supabase did not return the created user."
            )

        return response.user

    except AuthUserCreationError:
        raise

    except Exception as error:
        raise AuthUserCreationError(
            "Could not create the authentication user."
        ) from error


def delete_auth_user(*, auth_user_id: str) -> None:
    try:
        supabase = get_supabase_admin_client()
        supabase.auth.admin.delete_user(auth_user_id)

    except Exception:
        pass



~/Git/beeapp_ai/Backend/beeAppBack/beeAppBack/core/supabase_client.py
import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from supabase import Client, create_client


BASE_DIR = Path(__file__).resolve().parents[2]

load_dotenv(BASE_DIR / ".env")


def _get_required_env(name: str) -> str:
    value = os.getenv(name)

    if not value:
        raise RuntimeError(
            f"Missing required environment variable: {name}"
        )

    return value


@lru_cache
def get_supabase_publishable_client() -> Client:
    return create_client(
        _get_required_env("SUPABASE_URL"),
        _get_required_env("SUPABASE_PUBLISHABLE_KEY"),
    )


@lru_cache
def get_supabase_admin_client() -> Client:
    return create_client(
        _get_required_env("SUPABASE_URL"),
        _get_required_env("SUPABASE_SECRET_KEY"),
    )




fronted 

~/Git/beeapp_ai/Fronted/apps/mobile/app/onboarding/index.tsx
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


~/Git/beeapp_ai/Fronted/apps/mobile/src/components/onboarding/AboutYouSection.tsx
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { colors } from '@beeapp/design-system';
import { Camera } from 'lucide-react-native';
import { sharedStyles as styles, getInitials } from './onboardingShared';

interface AboutYouSectionProps {
  name: string;
  onNameChange: (value: string) => void;
  email: string;
  onEmailChange: (value: string) => void;
  occupation: string;
  onOccupationChange: (value: string) => void;
  address: string;
  onAddressChange: (value: string) => void;
  hasPhoto: boolean;
  onTogglePhoto: () => void;
}

export default function AboutYouSection({
  name,
  onNameChange,
  email,
  onEmailChange,
  occupation,
  onOccupationChange,
  address,
  onAddressChange,
  hasPhoto,
  onTogglePhoto,
}: AboutYouSectionProps) {
  // Validate email format in UI
  const isEmailValid = email.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionHeader}>Sobre Ti</Text>

      {/* Avatar selection mock */}
      <View style={styles.avatarRow}>
        <TouchableOpacity style={styles.avatarButton} activeOpacity={0.8} onPress={onTogglePhoto}>
          {hasPhoto ? (
            <View style={[styles.avatarCircle, styles.avatarActive]}>
              <Text style={styles.avatarText}>{getInitials(name) || 'YO'}</Text>
              <View style={styles.avatarCheckBadge}>
                <Text style={styles.avatarCheckText}>✓</Text>
              </View>
            </View>
          ) : (
            <View style={styles.avatarCircle}>
              <Camera size={24} color={colors.neutral.gray600} />
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.avatarInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <Text style={styles.avatarInfoTitle}>Foto de Perfil</Text>
            <View style={{ backgroundColor: colors.neutral.gray200, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 6 }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: colors.neutral.gray600, textTransform: 'uppercase' }}>Opcional</Text>
            </View>
          </View>
          <Text style={styles.avatarInfoDesc}>
            {hasPhoto ? 'Foto cargada (Simulado)' : 'Toca para cargar'}
          </Text>
        </View>
      </View>

      {/* Inputs */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Nombre Completo *</Text>
        <TextInput
          style={styles.inputField}
          placeholder="Ingresa tu nombre y apellido"
          placeholderTextColor={colors.neutral.gray500}
          value={name}
          onChangeText={onNameChange}
        />
      </View>

      {/* New Email Field */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Correo Electrónico *</Text>
        <TextInput
          style={[
            styles.inputField,
            !isEmailValid && { borderColor: colors.semantic.error, borderWidth: 1 }
          ]}
          placeholder="Ingresa tu correo electrónico"
          placeholderTextColor={colors.neutral.gray500}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={onEmailChange}
        />
        {!isEmailValid && (
          <Text style={{ color: colors.semantic.error, fontSize: 11, marginTop: 4 }}>
            Ingresa un formato de correo válido.
          </Text>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>¿A qué te dedicas?</Text>
        <TextInput
          style={styles.inputField}
          placeholder="Ej. Desarrollador, Gerente, Diseñador"
          placeholderTextColor={colors.neutral.gray500}
          value={occupation}
          onChangeText={onOccupationChange}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Ciudad o Dirección</Text>
        <TextInput
          style={styles.inputField}
          placeholder="Ej. Bogotá, Colombia"
          placeholderTextColor={colors.neutral.gray500}
          value={address}
          onChangeText={onAddressChange}
        />
      </View>
    </View>
  );
}


~/Git/beeapp_ai/Fronted/apps/mobile/src/components/onboarding/onboardingShared.ts
import { StyleSheet } from 'react-native';
import { colors } from '@beeapp/design-system';

// Helper to get initials for avatar mock
export const getInitials = (text: string) => {
  if (!text) return '';
  return text
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

// Estilos compartidos entre los pasos del onboarding
export const sharedStyles = StyleSheet.create({
  stepWrapper: {
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.neutral.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.neutral.gray600,
    lineHeight: 20,
    marginBottom: 24,
  },
  sectionCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.text,
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.neutral.gray600,
    marginTop: -12,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputField: {
    backgroundColor: colors.neutral.gray50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.neutral.text,
    fontWeight: '400',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarButton: {
    marginRight: 16,
  },
  avatarCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.neutral.gray100,
    borderWidth: 2,
    borderColor: colors.neutral.gray300,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '400',
    color: colors.neutral.white,
  },
  avatarCheckBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.semantic.success,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.neutral.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCheckText: {
    color: colors.neutral.white,
    fontSize: 10,
    fontWeight: '400',
  },
  avatarPlaceholderText: {
    fontSize: 9,
    fontWeight: '400',
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
  },
  avatarInfo: {
    flex: 1,
  },
  avatarInfoTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral.text,
    marginBottom: 2,
  },
  avatarInfoDesc: {
    fontSize: 12,
    color: colors.neutral.gray600,
  },
});


~/Git/beeapp_ai/Fronted/apps/mobile/src/components/onboarding/AssistantSection.tsx

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


~/Git/beeapp_ai/Fronted/apps/mobile/src/components/onboarding/FeaturesSection.tsx

import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@beeapp/design-system';
import {
  Mail,
  MessageCircle,
  FileText,
  Folder,
  Calendar,
  Sparkles,
  Bell,
  MapPin,
  Camera,
  Mic,
  HardDrive,
} from 'lucide-react-native';

const BENEFITS = [
  { icon: Mail, title: 'Correo unificado', desc: 'Conecta Gmail y Outlook en un solo buzón inteligente.' },
  { icon: MessageCircle, title: 'Chats y llamadas', desc: 'Conversa, llama y haz videollamadas con tus equipos de trabajo.' },
  { icon: FileText, title: 'Notas', desc: 'Guarda, edita y organiza tus ideas y recordatorios diarios.' },
  { icon: Folder, title: 'Archivos', desc: 'Almacena, organiza y firma digitalmente todos tus documentos.' },
  { icon: Calendar, title: 'Agenda', desc: 'Programa y administra reuniones corporativas en segundos.' },
  { icon: Sparkles, title: 'Asistente de IA', desc: 'Agiliza envíos de mails, notas y búsquedas con comandos de voz.' },
];

const PERMISSIONS = [
  { icon: Bell, title: 'Notificaciones', desc: 'Te avisa sobre nuevos mensajes, llamadas entrantes o recordatorios de reuniones.' },
  { icon: MapPin, title: 'Ubicación', desc: 'Sirve para autocompletar tu dirección laboral o compartir ubicación real en chats.' },
  { icon: Camera, title: 'Cámara', desc: 'Para tomar fotos de perfil, realizar videollamadas y escanear tus documentos físicos.' },
  { icon: Mic, title: 'Micrófono', desc: 'Habilita las llamadas de voz, grabación de audios de chat y dictado por voz al asistente.' },
  { icon: HardDrive, title: 'Almacenamiento', desc: 'Para descargar archivos compartidos y adjuntar documentos desde tu dispositivo móvil.' },
];

export default function FeaturesSection() {
  return (
    <>
      {/* List of Benefits */}
      <Text style={styles.groupHeader}>Beneficios Clave</Text>
      <View style={styles.listCard}>
        {BENEFITS.map((benefit) => (
          <View key={benefit.title} style={styles.listItem}>
            <benefit.icon size={22} color={colors.brand.primary} style={styles.listIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.listItemTitle}>{benefit.title}</Text>
              <Text style={styles.listItemDesc}>{benefit.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Explanation of System Permissions (No systems prompts triggered here) */}
      <Text style={styles.groupHeader}>Accesos Informativos (Opcionales)</Text>
      <Text style={styles.permissionsNotice}>
        Para habilitar todas las funciones, te explicamos qué accesos utilizaremos en la app y por qué:
      </Text>

      <View style={styles.listCard}>
        {PERMISSIONS.map((permission) => (
          <View key={permission.title} style={styles.permissionItem}>
            <permission.icon size={18} color={colors.brand.primary} style={styles.listIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.permissionTitle}>{permission.title}</Text>
              <Text style={styles.permissionDesc}>{permission.desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  groupHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 8,
  },
  listCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    marginBottom: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  listIcon: {
    marginRight: 14,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.text,
    marginBottom: 2,
  },
  listItemDesc: {
    fontSize: 12,
    color: colors.neutral.gray600,
  },
  permissionsNotice: {
    fontSize: 13,
    color: colors.neutral.gray600,
    lineHeight: 18,
    marginBottom: 12,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  permissionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.text,
    marginBottom: 2,
  },
  permissionDesc: {
    fontSize: 11,
    color: colors.neutral.gray600,
    lineHeight: 15,
  },
});


~/Git/beeapp_ai/Fronted/apps/mobile/app/(auth)/app-lock-setup.tsx
import React from 'react';
import ScreenSafeArea from '../../src/components/layout/ScreenSafeArea';
import { useRouter } from 'expo-router';
import { colors } from '@beeapp/design-system';
import { View, StyleSheet } from 'react-native';
import AppLockSetupScreen from '../../src/components/security/AppLockSetupScreen';

export default function AppLockSetupRoute() {
  const router = useRouter();

  const handleComplete = () => {
    router.replace('/onboarding');
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <AppLockSetupScreen onComplete={handleComplete} />
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.neutral.gray50 },
  container: { flex: 1 },
});


~/Git/beeapp_ai/Fronted/apps/mobile/src/services/authSession.ts
import * as SecureStore from 'expo-secure-store';
import type {
    AuthenticatedUser,
    AuthSession,
    } from '@beeapp/shared-types';

const AUTH_SESSION_KEY = 'beeapp.auth.session';

export interface PersistedAuthSession {
    session: AuthSession;
    user: AuthenticatedUser;
}

export async function saveAuthSession(
    authSession: PersistedAuthSession,
    ): Promise<void> {
    await SecureStore.setItemAsync(
        AUTH_SESSION_KEY,
        JSON.stringify(authSession),
    );
}

export async function getAuthSession(): Promise<PersistedAuthSession | null> {
    const storedSession = await SecureStore.getItemAsync(
        AUTH_SESSION_KEY,
    );

    if (!storedSession) {
        return null;
    }

    try {
        return JSON.parse(storedSession) as PersistedAuthSession;
    } catch {
        await clearAuthSession();
        return null;
    }
}

export async function clearAuthSession(): Promise<void> {
    await SecureStore.deleteItemAsync(AUTH_SESSION_KEY);
}

~/Git/beeapp_ai/Fronted/packages/api-client/src/accounts.ts
import type {
    LoginUserPayload,
    LoginUserResponse,
    RegisterUserPayload,
    RegisterUserResponse,
    } from '@beeapp/shared-types';

import { api } from './client';

export function registerUser(
    payload: RegisterUserPayload,
    ): Promise<RegisterUserResponse> {
    return api.post<RegisterUserResponse>(
        '/accounts/register/',
        payload,
    );
}

export function loginUser(
    payload: LoginUserPayload,
    ): Promise<LoginUserResponse> {
    return api.post<LoginUserResponse>(
        '/accounts/login/',
        payload,
    );
}

~/Git/beeapp_ai/Fronted/packages/api-client/src/client.ts
const expoApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const nextApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

const configuredApiBaseUrl = expoApiBaseUrl || nextApiBaseUrl;

if (!configuredApiBaseUrl) {
    throw new Error(
        `Backend URL is missing. EXPO_PUBLIC_API_BASE_URL=${String(
        expoApiBaseUrl
        )}, NEXT_PUBLIC_API_BASE_URL=${String(nextApiBaseUrl)}`
    );
}

export const API_BASE_URL: string = configuredApiBaseUrl;

export interface ApiErrorResponse {
    detail?: string;
    message?: string;
    error?: string;
    [key: string]: unknown;
}

export interface ApiRequestOptions
    extends Omit<RequestInit, "body" | "headers"> {
    body?: unknown;
    token?: string | null;
    headers?: Record<string, string>;
}

function buildUrl(endpoint: string): string {
    const normalizedBaseUrl = API_BASE_URL.replace(/\/+$/, "");
    const normalizedEndpoint = endpoint.startsWith("/")
        ? endpoint
        : `/${endpoint}`;

    return `${normalizedBaseUrl}${normalizedEndpoint}`;
}

async function request<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
    ): Promise<T> {
    const { body, token, headers, ...fetchOptions } = options;

    const response = await fetch(buildUrl(endpoint), {
        ...fetchOptions,
        headers: {
        Accept: "application/json",
        ...(body !== undefined
            ? { "Content-Type": "application/json" }
            : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers
        },
        body: body !== undefined ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
        let errorMessage = `Error ${response.status}: backend request failed.`;

        try {
        const errorData: ApiErrorResponse = await response.json();

        errorMessage =
            errorData.detail ||
            errorData.message ||
            errorData.error ||
            errorMessage;
        } catch {
        // Keep the default message when the response is not JSON.
        }

        throw new Error(errorMessage);
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return response.json() as Promise<T>;
}

export const api = {
    get<T>(
        endpoint: string,
        options: Omit<ApiRequestOptions, "method"> = {}
    ): Promise<T> {
        return request<T>(endpoint, {
        ...options,
        method: "GET"
        });
    },

    post<T>(
        endpoint: string,
        body?: unknown,
        options: Omit<ApiRequestOptions, "method" | "body"> = {}
    ): Promise<T> {
        return request<T>(endpoint, {
        ...options,
        method: "POST",
        body
        });
    },

    put<T>(
        endpoint: string,
        body?: unknown,
        options: Omit<ApiRequestOptions, "method" | "body"> = {}
    ): Promise<T> {
        return request<T>(endpoint, {
        ...options,
        method: "PUT",
        body
        });
    },

    patch<T>(
        endpoint: string,
        body?: unknown,
        options: Omit<ApiRequestOptions, "method" | "body"> = {}
    ): Promise<T> {
        return request<T>(endpoint, {
        ...options,
        method: "PATCH",
        body
        });
    },

    delete<T>(
        endpoint: string,
        options: Omit<ApiRequestOptions, "method"> = {}
    ): Promise<T> {
        return request<T>(endpoint, {
        ...options,
        method: "DELETE"
        });
    }
};

export function getApiUrl(endpoint: string): string {
    return buildUrl(endpoint);
}

~/Git/beeapp_ai/Fronted/packages/api-client/src/index.ts
export * from './client';
export * from './accounts';


~/Git/beeapp_ai/Fronted/packages/shared-types/src/index.ts

export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export type UserStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'PENDING';

export interface BaseUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface RegisterUserPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone_dial_code: string;
  phone_number: string;
}

export interface RegisteredUser {
  id: string;
  email: string;
  phone: string | null;
  first_name: string;
  last_name: string;
  phone_dial_code: string;
  phone_number: string;
  role: UserRole;
}

export interface RegisterUserResponse {
  message: string;
  user: RegisteredUser;
}

export interface LoginUserPayload {
  email: string;
  password: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number | null;
  expires_in: number | null;
  token_type: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  phone: string | null;
}

export interface LoginUserResponse {
  message: string;
  session: AuthSession;
  user: AuthenticatedUser;
}