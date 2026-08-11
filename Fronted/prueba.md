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
export * from "./client";


~/Git/beeapp_ai/Fronted/packages/shared-types/src/index.ts
/**
 * Shared TypeScript types across mobile app and admin web panel.
 * Placeholder type definitions to be expanded during development phases.
 */

export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';

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


~/Git/beeapp_ai/Fronted/apps/mobile-web/src/components/auth/QrLogin.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft } from 'lucide-react';
import BeeAppLogo from '@/components/BeeAppLogo';

/** Sesión mock que codifica el QR: la reemplazará el token real del backend */
const MOCK_SESSION = 'beeapp-web-session-abc123';

const STEPS = [
  'Abre BeeApp AI en tu teléfono',
  'Ve a Menú > Dispositivos',
  'Escanea el código QR',
];

/** Único método de inicio de sesión de la web: escanear el QR desde la app móvil */
export default function QrLogin() {
  const router = useRouter();

  return (
    <div className="w-full max-w-md bg-white p-6 sm:p-8 rounded-3xl sm:border sm:border-neutral-200/80 sm:shadow-xl space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col items-center text-center space-y-3">
        <Link href="/" className="mb-1">
          <BeeAppLogo height={52} />
        </Link>
        <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900 tracking-tight">
          Inicia sesión en BeeApp Web
        </h1>
        <p className="text-sm text-neutral-600 font-normal max-w-xs">
          Escanea el código QR desde la app de BeeApp AI en tu teléfono para iniciar sesión.
        </p>
      </div>

      {/* Código QR */}
      <div className="flex justify-center">
        <div className="rounded-2xl border border-neutral-200 p-4 bg-white">
          <QRCodeSVG value={MOCK_SESSION} size={218} level="M" marginSize={0} />
        </div>
      </div>

      {/* Botón de prueba: desaparece cuando exista backend real */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => router.push('/app')}
          className="h-9 px-4 rounded-xl bg-neutral-100 text-neutral-600 text-xs font-normal hover:bg-neutral-200/70 transition-colors"
        >
          Simular escaneo
        </button>
      </div>

      {/* Instrucciones */}
      <ol className="space-y-2">
        {STEPS.map((step, index) => (
          <li key={step} className="flex items-start gap-2.5 text-xs text-neutral-500 font-normal">
            <span className="shrink-0 w-4 h-4 rounded-full bg-neutral-100 text-neutral-600 text-[10px] font-normal flex items-center justify-center mt-px">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      {/* Navegación */}
      <div className="text-center pt-4 border-t border-neutral-100">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-900 font-normal transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al inicio</span>
        </Link>
      </div>
    </div>
  );
}


~/Git/beeapp_ai/Fronted/.env
EXPO_PUBLIC_API_BASE_URL=http:dasdsadasdasd



backend 
~/Git/beeapp_ai/Backend/beeAppBack/apps/accounts/views.py
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.exceptions import AccountRegistrationError
from apps.accounts.serializers import RegisterUserSerializer
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


~/Git/beeapp_ai/Backend/beeAppBack/apps/accounts/urls.py
from django.urls import path

from apps.accounts.views import RegisterUserView


urlpatterns = [
    path("register/", RegisterUserView.as_view(), name="register-user"),
]



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


~/Git/beeapp_ai/Backend/beeAppBack/apps/accounts/services/registration_service.py
from apps.accounts.services.auth_user_service import (
    create_auth_user,
    delete_auth_user,
)
from apps.accounts.services.profile_service import create_profile


def create_complete_user(
    *,
    first_name: str,
    last_name: str,
    email: str,
    password: str,
    phone_dial_code: str,
    phone_number: str,
):
    auth_user = create_auth_user(
        email=email,
        password=password,
        phone_dial_code=phone_dial_code,
        phone_number=phone_number,
    )

    try:
        profile = create_profile(
            auth_user_id=str(auth_user.id),
            first_name=first_name,
            last_name=last_name,
            phone_dial_code=phone_dial_code,
            phone_number=phone_number,
        )

    except Exception:
        delete_auth_user(auth_user_id=str(auth_user.id))
        raise

    return {
        "auth_user_id": str(auth_user.id),
        "email": auth_user.email,
        "phone": auth_user.phone,
        "profile": profile,
    }



~/Git/beeapp_ai/Backend/beeAppBack/beeAppBack/settings.py

"""
Django settings for beeAppBack project.

Generated by 'django-admin startproject' using Django 6.1.
"""

from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent


# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-k=ku$g@&=djw^$8p9&61pz*f9%yvicd$rgb3e)t+0v0u=#mwh^'


# Solo para desarrollo local.
DEBUG = True


# Permite acceder a Django desde tu PC y desde tu teléfono
# usando la IP local de tu computador.
ALLOWED_HOSTS = [
    "127.0.0.1",
    "localhost",
    "192.168.1.5",
]


INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "apps.accounts.apps.AccountsConfig",
]


MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


ROOT_URLCONF = "beeAppBack.urls"


TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


WSGI_APPLICATION = "beeAppBack.wsgi.application"


DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}


AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "UserAttributeSimilarityValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "MinimumLengthValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "CommonPasswordValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "NumericPasswordValidator"
        ),
    },
]


LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


STATIC_URL = "static/"


MAILERS = {
    "default": {
        "BACKEND": "django.core.mail.backends.console.EmailBackend",
    },
}


# Orígenes de los frontends permitidos durante desarrollo.
# mobile nativo no usa CORS, pero mobile-web y admin-web sí.

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.1.5:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://192.168.1.5:3001",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://192.168.1.5:8081",
]
