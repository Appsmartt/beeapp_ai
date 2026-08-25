'use client';

import { type FormEvent, type ReactNode, useState } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    CheckCircle2,
    Eye,
    EyeOff,
    LockKeyhole,
    Mail,
    Phone,
    ShieldCheck,
    User,
    UserPlus,
    } from 'lucide-react';

import { registerUser } from '@beeapp/api-client';
import type { RegisterUserPayload } from '@beeapp/shared-types';

import BuddyLogo from '../BuddyLogo';
import CountrySelector, {
    COUNTRIES,
    type Country,
    } from './CountrySelector';

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

function normalizePhoneNumber(value: string): string {
    return value.replace(/\D/g, '');
}

function isValidEmail(value: string): boolean {
    return /^\S+@\S+\.\S+$/.test(value);
}

export default function RegisterForm() {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [country, setCountry] = useState<Country>(COUNTRIES[0]);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createdUserName, setCreatedUserName] = useState<string | null>(null);

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

        if (!normalizedPhoneNumber) {
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

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        if (!validateForm()) {
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

        setCreatedUserName(
            `${response.user.first_name} ${response.user.last_name}`,
        );
        } catch (error) {
        setErrors({
            form:
            error instanceof Error
                ? error.message
                : 'No fue posible crear la cuenta. Inténtalo nuevamente.',
        });
        } finally {
        setIsSubmitting(false);
        }
    };

    if (createdUserName) {
        return (
        <section className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl sm:border sm:border-neutral-200/80 sm:p-8">
            <div
            className="flex flex-col items-center text-center"
            role="status"
            aria-live="polite"
            >
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-9 w-9" />
            </div>

            <h1 className="text-2xl font-semibold text-neutral-900">
                Cuenta creada correctamente
            </h1>

            <p className="mt-3 max-w-sm text-sm leading-relaxed text-neutral-600">
                Bienvenido a Buddy AI, {createdUserName}. Tu usuario y perfil
                fueron creados correctamente.
            </p>

            <Link
                href="/login"
                className="mt-7 flex h-12 w-full items-center justify-center rounded-xl bg-brand-primary text-sm font-semibold text-white shadow-md transition-colors hover:bg-brand-dark"
            >
                Ir al inicio de sesión
            </Link>
            </div>
        </section>
        );
    }

    return (
        <section className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl sm:border sm:border-neutral-200/80 sm:p-8">
        <div className="mb-6">
            <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-500 transition-colors hover:text-neutral-900"
            >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Volver al inicio</span>
            </Link>
        </div>

        <div className="mb-7 flex flex-col items-center text-center">
            <Link
            href="/"
            className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary"
            aria-label="Ir al inicio de Buddy AI"
            >
            <BuddyLogo height={38} showText={false} />
            </Link>

            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary">
            <UserPlus className="h-5 w-5" />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            Crea tu cuenta
            </h1>

            <p className="mt-2 max-w-md text-sm leading-relaxed text-neutral-600">
            Crea tu usuario, protege tu cuenta con una contraseña y completa tu
            perfil inicial en Buddy AI.
            </p>
        </div>

        {errors.form && (
            <div
            className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs leading-relaxed text-red-700"
            role="alert"
            >
            {errors.form}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

            <div className="space-y-1.5">
            <label
                htmlFor="phoneNumber"
                className="text-xs font-semibold text-neutral-700"
            >
                Número de celular
            </label>

            <div className="flex h-12 items-center">
                <CountrySelector
                selectedCountry={country}
                onSelectCountry={(selectedCountry) => {
                    setCountry(selectedCountry);
                    clearError('phoneNumber');
                }}
                />

                <div
                className={`flex h-full min-w-0 flex-1 items-center gap-2.5 rounded-r-xl border border-l-0 bg-white px-3 transition-colors focus-within:border-brand-primary ${
                    errors.phoneNumber
                    ? 'border-red-400'
                    : 'border-neutral-300'
                }`}
                >
                <Phone className="h-4 w-4 shrink-0 text-neutral-400" />

                <input
                    id="phoneNumber"
                    type="tel"
                    value={phoneNumber}
                    onChange={(event) => {
                    setPhoneNumber(
                        event.target.value.replace(/\D/g, ''),
                    );
                    clearError('phoneNumber');
                    }}
                    placeholder="300 123 4567"
                    autoComplete="tel-national"
                    inputMode="numeric"
                    required
                    className="min-w-0 flex-1 bg-transparent text-xs text-neutral-900 outline-none placeholder:text-neutral-400"
                />
                </div>
            </div>

            {errors.phoneNumber ? (
                <p className="text-xs text-red-600">
                {errors.phoneNumber}
                </p>
            ) : (
                <p className="pl-1 text-xs text-neutral-500">
                Usaremos este número para asociar tu cuenta.
                </p>
            )}
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
            onToggleVisibility={() => {
                setShowPassword((current) => !current);
            }}
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
            onToggleVisibility={() => {
                setShowConfirmPassword((current) => !current);
            }}
            onChange={(value) => {
                setConfirmPassword(value);
                clearError('confirmPassword');
            }}
            />

            <label className="flex cursor-pointer items-start gap-2.5 pt-1">
            <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => {
                setAcceptedTerms(event.target.checked);
                clearError('form');
                }}
                className="mt-0.5 h-4 w-4 rounded border-neutral-300 accent-brand-primary"
            />

            <span className="text-xs leading-relaxed text-neutral-600">
                Acepto los Términos y Condiciones y la Política de Privacidad de
                Buddy AI.
            </span>
            </label>

            <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-primary text-sm font-semibold text-white shadow-md transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
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

        <div className="mt-6 border-t border-neutral-100 pt-5 text-center">
            <p className="text-xs text-neutral-600">
            ¿Ya tienes una cuenta?{' '}
            <Link
                href="/login"
                className="font-semibold text-brand-primary transition-colors hover:text-brand-dark"
            >
                Inicia sesión
            </Link>
            </p>
        </div>
        </section>
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
        <div className="space-y-1.5">
        <label
            htmlFor={id}
            className="text-xs font-semibold text-neutral-700"
        >
            {label}
        </label>

        <div
            className={`flex h-12 items-center gap-2.5 rounded-xl border bg-white px-3 transition-colors focus-within:border-brand-primary ${
            error ? 'border-red-400' : 'border-neutral-300'
            }`}
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
            className="min-w-0 flex-1 bg-transparent text-xs text-neutral-900 outline-none placeholder:text-neutral-400"
            />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
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
        <div className="space-y-1.5">
        <label
            htmlFor={id}
            className="text-xs font-semibold text-neutral-700"
        >
            {label}
        </label>

        <div
            className={`flex h-12 items-center gap-2.5 rounded-xl border bg-white px-3 transition-colors focus-within:border-brand-primary ${
            error ? 'border-red-400' : 'border-neutral-300'
            }`}
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
            className="min-w-0 flex-1 bg-transparent text-xs text-neutral-900 outline-none placeholder:text-neutral-400"
            />

            <button
            type="button"
            onClick={onToggleVisibility}
            className="text-neutral-400 transition-colors hover:text-neutral-700"
            aria-label={
                show ? 'Ocultar contraseña' : 'Mostrar contraseña'
            }
            >
            {show ? (
                <EyeOff className="h-4 w-4" />
            ) : (
                <Eye className="h-4 w-4" />
            )}
            </button>
        </div>

        {error ? (
            <p className="text-xs text-red-600">{error}</p>
        ) : (
            <p className="text-xs text-neutral-500">
            Usa al menos 8 caracteres.
            </p>
        )}
        </div>
    );
}