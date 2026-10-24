'use client';

import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  User,
} from 'lucide-react';

import { adoptSupabaseSession, registerUser } from '@beeapp/api-client';
import type { RegisterUserPayload } from '@beeapp/shared-types';

import AuthPageShell from '@/components/auth/AuthPageShell';
import LandingNavbar from '@/components/landing/LandingNavbar';
import CountrySelector, { type Country } from './CountrySelector';
import { loadRegistrationCountries } from '@/lib/client/publicAppSettings';

type FormErrors = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  password?: string;
  confirmPassword?: string;
  form?: string;
};

const MIN_PASSWORD_LENGTH = 8;

const inputWrap =
  'flex h-10 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-2.5 transition-colors focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/15';

function normalizePhoneNumber(value: string): string {
  return value.replace(/\D/g, '');
}

function isValidEmail(value: string): boolean {
  return /^\S+@\S+\.\S+$/.test(value);
}

function registerErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';

  if (/ya existe una cuenta|already registered|already been registered/i.test(message)) {
    return 'Ya existe una cuenta con ese correo. Inicia sesión.';
  }

  if (/contraseña no cumple|password/i.test(message)) {
    return 'La contraseña no cumple los requisitos de seguridad.';
  }

  if (/correo electrónico no es válido|invalid email/i.test(message)) {
    return 'Ingresa un correo electrónico válido.';
  }

  return message || 'No fue posible crear la cuenta. Inténtalo nuevamente.';
}

export default function RegisterForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);
  const [country, setCountry] = useState<Country | null>(null);

  useEffect(() => {
    void loadRegistrationCountries().then((list) => {
      setCountries(list);
      setCountry((current) => current ?? list[0] ?? null);
    });
  }, []);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdUserName, setCreatedUserName] = useState<string | null>(null);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const clearError = (field: keyof FormErrors) => {
    setErrors((current) => ({
      ...current,
      [field]: undefined,
      form: undefined,
    }));
  };

  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {};
    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

    if (!firstName.trim()) {
      nextErrors.firstName = 'Ingresa tu nombre.';
    }

    if (!lastName.trim()) {
      nextErrors.lastName = 'Ingresa tu apellido.';
    }

    if (!email.trim()) {
      nextErrors.email = 'Ingresa tu correo electrónico.';
    } else if (!isValidEmail(email.trim())) {
      nextErrors.email = 'Ingresa un correo electrónico válido.';
    }

    if (!country) {
      nextErrors.phoneNumber = 'Lista de países no disponible.';
    } else if (!normalizedPhoneNumber) {
      nextErrors.phoneNumber = 'Ingresa tu número de celular.';
    } else if (normalizedPhoneNumber.length < 7) {
      nextErrors.phoneNumber = 'Ingresa un número de celular válido.';
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.password =
        'La contraseña debe tener al menos 8 caracteres.';
    }

    if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Las contraseñas no coinciden.';
    }

    if (!acceptedTerms) {
      nextErrors.form =
        'Debes aceptar los Términos y Condiciones para continuar.';
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm() || !country) {
      return;
    }

    const payload: RegisterUserPayload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim().toLowerCase(),
      password,
      phone_dial_code: country.dialCode.replace('+', ''),
      phone_number: normalizePhoneNumber(phoneNumber),
    };

    try {
      setIsSubmitting(true);
      setErrors({});

      const response = await registerUser(payload);

      if (response.session?.access_token && response.session.refresh_token) {
        await adoptSupabaseSession({
          access_token: response.session.access_token,
          refresh_token: response.session.refresh_token,
        });
        router.replace('/app');
        return;
      }

      setNeedsEmailConfirmation(/correo|confirmar/i.test(response.message));
      setCreatedUserName(
        `${response.user.first_name} ${response.user.last_name}`,
      );
    } catch (error) {
      setErrors({
        form: registerErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createdUserName) {
    return (
      <div className="min-h-screen bg-white font-sans text-neutral-900">
        <LandingNavbar />
        <main className="max-w-md mx-auto px-4 py-16 sm:py-24 text-center space-y-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Cuenta creada</h1>
          <p className="text-sm text-neutral-600 leading-relaxed">
            {needsEmailConfirmation
              ? `Bienvenido a Buddy AI, ${createdUserName}. Revisa tu correo para confirmar la cuenta y luego inicia sesión.`
              : `Bienvenido a Buddy AI, ${createdUserName}. Ya puedes iniciar sesión.`}
          </p>
          <Link
            href="/login"
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-brand-primary text-sm font-semibold text-white shadow-sm hover:bg-brand-dark transition-colors"
          >
            Ir al inicio de sesión
          </Link>
        </main>
      </div>
    );
  }

  return (
    <AuthPageShell
      mode="register"
      title="Crea tu cuenta"
      subtitle="Completa tus datos. El registro crea un usuario con rol cliente."
    >
      {errors.form ? (
        <div
          className="mb-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700 leading-snug"
          role="alert"
        >
          {errors.form}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-2.5" noValidate>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <InputField
            id="firstName"
            label="Nombre"
            value={firstName}
            placeholder="Tu nombre"
            autoComplete="given-name"
            error={errors.firstName}
            icon={<User className="h-4 w-4 shrink-0 text-neutral-400" />}
            onChange={(value) => {
              setFirstName(value);
              clearError('firstName');
            }}
          />

          <InputField
            id="lastName"
            label="Apellido"
            value={lastName}
            placeholder="Tu apellido"
            autoComplete="family-name"
            error={errors.lastName}
            icon={<User className="h-4 w-4 shrink-0 text-neutral-400" />}
            onChange={(value) => {
              setLastName(value);
              clearError('lastName');
            }}
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="phoneNumber"
            className="text-xs font-medium text-neutral-700"
          >
            Número de celular
          </label>

          <div className="flex h-10 items-center">
            <CountrySelector
              countries={countries}
              selectedCountry={country}
              onSelectCountry={(selectedCountry) => {
                setCountry(selectedCountry);
                clearError('phoneNumber');
              }}
            />

            <div
              className={`flex h-full min-w-0 flex-1 items-center gap-2 rounded-r-lg border border-l-0 bg-white px-2.5 transition-colors focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/15 ${
                errors.phoneNumber ? 'border-red-400' : 'border-neutral-300'
              }`}
            >
              <Phone className="h-4 w-4 shrink-0 text-neutral-400" />

              <input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(event) => {
                  setPhoneNumber(event.target.value.replace(/\D/g, ''));
                  clearError('phoneNumber');
                }}
                placeholder="300 123 4567"
                autoComplete="tel-national"
                inputMode="numeric"
                required
                className="min-w-0 flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
              />
            </div>
          </div>

          {errors.phoneNumber ? (
            <p className="text-xs leading-snug text-red-600">{errors.phoneNumber}</p>
          ) : null}
        </div>

        <InputField
          id="email"
          label="Correo electrónico"
          type="email"
          value={email}
          placeholder="tu@correo.com"
          autoComplete="email"
          error={errors.email}
          icon={<Mail className="h-4 w-4 shrink-0 text-neutral-400" />}
          onChange={(value) => {
            setEmail(value);
            clearError('email');
          }}
        />

        <PasswordField
          id="password"
          label="Contraseña"
          value={password}
          error={errors.password}
          show={showPassword}
          onToggleVisibility={() => setShowPassword((current) => !current)}
          onChange={(value) => {
            setPassword(value);
            clearError('password');
          }}
        />

        <PasswordField
          id="confirmPassword"
          label="Confirmar contraseña"
          value={confirmPassword}
          error={errors.confirmPassword}
          show={showConfirmPassword}
          onToggleVisibility={() =>
            setShowConfirmPassword((current) => !current)
          }
          onChange={(value) => {
            setConfirmPassword(value);
            clearError('confirmPassword');
          }}
        />

        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) => {
              setAcceptedTerms(event.target.checked);
              clearError('form');
            }}
            className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-neutral-300 accent-brand-primary"
          />

          <span className="text-[11px] leading-snug text-neutral-600">
            Acepto los{' '}
            <Link href="/terms" className="font-medium text-brand-primary hover:underline">
              Términos y Condiciones
            </Link>{' '}
            y la{' '}
            <Link href="/privacy" className="font-medium text-brand-primary hover:underline">
              Política de Privacidad
            </Link>{' '}
            de Buddy AI.
          </span>
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-brand-primary text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              <span>Creando cuenta...</span>
            </>
          ) : (
            <>
              <span>Crear cuenta</span>
              <ShieldCheck className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </AuthPageShell>
  );
}

interface InputFieldProps {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  autoComplete: string;
  icon: ReactNode;
  error?: string;
  type?: 'text' | 'email';
  onChange: (value: string) => void;
}

function InputField({
  id,
  label,
  value,
  placeholder,
  autoComplete,
  icon,
  error,
  type = 'text',
  onChange,
}: InputFieldProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-medium text-neutral-700">
        {label}
      </label>

      <div
        className={`${inputWrap} ${error ? 'border-red-400 focus-within:ring-red-100' : ''}`}
      >
        {icon}

        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          className="min-w-0 flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
        />
      </div>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  error?: string;
  show: boolean;
  onToggleVisibility: () => void;
  onChange: (value: string) => void;
}

function PasswordField({
  id,
  label,
  value,
  error,
  show,
  onToggleVisibility,
  onChange,
}: PasswordFieldProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-medium text-neutral-700">
        {label}
      </label>

      <div
        className={`${inputWrap} ${error ? 'border-red-400 focus-within:ring-red-100' : ''}`}
      >
        <LockKeyhole className="h-4 w-4 shrink-0 text-neutral-400" />

        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
          required
          className="min-w-0 flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
        />

        <button
          type="button"
          onClick={onToggleVisibility}
          className="text-neutral-400 transition-colors hover:text-neutral-700"
          aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {error ? <p className="text-xs leading-snug text-red-600">{error}</p> : null}
    </div>
  );
}
