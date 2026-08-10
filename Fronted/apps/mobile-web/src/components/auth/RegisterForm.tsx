"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    CheckCircle2,
    Mail,
    Phone,
    ShieldCheck,
    User,
    UserPlus,
    } from "lucide-react";

import BeeAppLogo from "../BeeAppLogo";
import CountrySelector, {
    COUNTRIES,
    type Country,
    } from "./CountrySelector";

export default function RegisterForm() {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [country, setCountry] = useState<Country>(COUNTRIES[0]);
    const [phoneNumber, setPhoneNumber] = useState("");
    const [email, setEmail] = useState("");
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!firstName.trim() || !lastName.trim() || !phoneNumber.trim()) {
        return;
        }

        setSubmitted(true);
    };

    const handleFieldChange = () => {
        if (submitted) {
        setSubmitted(false);
        }
    };

    return (
        <section className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl sm:border sm:border-neutral-200/80 sm:p-8">
        <div className="mb-6">
            <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-normal text-neutral-500 transition-colors hover:text-neutral-900"
            >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Volver al inicio</span>
            </Link>
        </div>

        <div className="mb-7 flex flex-col items-center text-center">
            <Link
            href="/"
            className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-primary10 text-brand-primary transition-colors hover:bg-brand-primary15"
            aria-label="Ir al inicio de BeeApp AI"
            >
            <BeeAppLogo height={38} showText={false} />
            </Link>

            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-primary10 text-brand-primary">
            <UserPlus className="h-5 w-5" />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            Crea tu cuenta
            </h1>

            <p className="mt-2 max-w-sm text-sm font-normal leading-relaxed text-neutral-600">
            Completa tus datos para empezar a usar BeeApp AI.
            </p>
        </div>

        {submitted && (
            <div
            className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800"
            role="status"
            aria-live="polite"
            >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div>
                <p className="font-semibold">Información registrada visualmente.</p>
                <p className="mt-0.5 font-normal leading-relaxed text-emerald-700">
                La conexión con el backend y la verificación por código se
                agregarán después de definir el flujo final con el cliente.
                </p>
            </div>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
                <label
                htmlFor="firstName"
                className="text-xs font-semibold text-neutral-700"
                >
                Nombre
                </label>

                <div className="flex h-12 items-center gap-2.5 rounded-xl border border-neutral-300 bg-white px-3 transition-colors focus-within:border-brand-primary">
                <User className="h-4 w-4 shrink-0 text-neutral-400" />

                <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(event) => {
                    setFirstName(event.target.value);
                    handleFieldChange();
                    }}
                    placeholder="Tu nombre"
                    autoComplete="given-name"
                    required
                    className="min-w-0 flex-1 bg-transparent text-xs font-normal text-neutral-900 outline-none placeholder:text-neutral-400"
                />
                </div>
            </div>

            <div className="space-y-1.5">
                <label
                htmlFor="lastName"
                className="text-xs font-semibold text-neutral-700"
                >
                Apellido
                </label>

                <div className="flex h-12 items-center gap-2.5 rounded-xl border border-neutral-300 bg-white px-3 transition-colors focus-within:border-brand-primary">
                <User className="h-4 w-4 shrink-0 text-neutral-400" />

                <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(event) => {
                    setLastName(event.target.value);
                    handleFieldChange();
                    }}
                    placeholder="Tu apellido"
                    autoComplete="family-name"
                    required
                    className="min-w-0 flex-1 bg-transparent text-xs font-normal text-neutral-900 outline-none placeholder:text-neutral-400"
                />
                </div>
            </div>
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
                    handleFieldChange();
                }}
                />

                <div className="flex h-full min-w-0 flex-1 items-center gap-2.5 rounded-r-xl border border-l-0 border-neutral-300 bg-white px-3 transition-colors focus-within:border-brand-primary">
                <Phone className="h-4 w-4 shrink-0 text-neutral-400" />

                <input
                    id="phoneNumber"
                    type="tel"
                    value={phoneNumber}
                    onChange={(event) => {
                    setPhoneNumber(event.target.value);
                    handleFieldChange();
                    }}
                    placeholder="300 123 4567"
                    autoComplete="tel-national"
                    inputMode="numeric"
                    required
                    className="min-w-0 flex-1 bg-transparent text-xs font-normal text-neutral-900 outline-none placeholder:text-neutral-400"
                />
                </div>
            </div>

            <p className="pl-1 text-11px font-normal text-neutral-500">
                Te enviaremos un código de verificación a este número.
            </p>
            </div>

            <div className="space-y-1.5">
            <label
                htmlFor="email"
                className="text-xs font-semibold text-neutral-700"
            >
                Correo electrónico{" "}
                <span className="font-normal text-neutral-400">(opcional)</span>
            </label>

            <div className="flex h-12 items-center gap-2.5 rounded-xl border border-neutral-300 bg-white px-3 transition-colors focus-within:border-brand-primary">
                <Mail className="h-4 w-4 shrink-0 text-neutral-400" />

                <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => {
                    setEmail(event.target.value);
                    handleFieldChange();
                }}
                placeholder="tu@correo.com"
                autoComplete="email"
                className="min-w-0 flex-1 bg-transparent text-xs font-normal text-neutral-900 outline-none placeholder:text-neutral-400"
                />
            </div>
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 pt-1">
            <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => {
                setAcceptedTerms(event.target.checked);
                handleFieldChange();
                }}
                required
                className="mt-0.5 h-4 w-4 rounded border-neutral-300 accent-brand-primary"
            />

            <span className="text-xs font-normal leading-relaxed text-neutral-600">
                Acepto los Términos y Condiciones y la Política de Privacidad de
                BeeApp AI.
            </span>
            </label>

            <button
            type="submit"
            disabled={!acceptedTerms}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-primary text-sm font-semibold text-white shadow-md shadow-brand-primary20 transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:shadow-none"
            >
            <span>Continuar</span>
            <ShieldCheck className="h-4 w-4" />
            </button>
        </form>

        <div className="mt-6 border-t border-neutral-100 pt-5 text-center">
            <p className="text-xs font-normal text-neutral-600">
            ¿Ya tienes una cuenta?{" "}
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