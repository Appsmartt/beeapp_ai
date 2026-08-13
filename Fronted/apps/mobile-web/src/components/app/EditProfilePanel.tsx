'use client';

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AlertCircle,
  AtSign,
  Briefcase,
  Check,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Music2,
  UserCheck,
  UserRound,
  Video,
  X,
} from 'lucide-react';
import {
  getCurrentWebProfile,
  updateCurrentWebProfile,
} from '@beeapp/api-client';
import type {
  CurrentUserProfile,
  SocialPlatform,
} from '@beeapp/shared-types';

import CountrySelector, {
  COUNTRIES,
  Country,
} from '@/components/auth/CountrySelector';

type SocialField = {
  platform: SocialPlatform;
  label: string;
  placeholder: string;
  icon: React.ElementType;
};

interface EditProfilePanelProps {
  onProfileUpdated?: (
    profile: CurrentUserProfile,
  ) => void;
}

const SOCIAL_FIELDS: SocialField[] = [
  {
    platform: 'instagram',
    label: 'Instagram',
    placeholder: 'https://instagram.com/usuario',
    icon: AtSign,
  },
  {
    platform: 'facebook',
    label: 'Facebook',
    placeholder: 'https://facebook.com/usuario',
    icon: Globe,
  },
  {
    platform: 'linkedin',
    label: 'LinkedIn',
    placeholder: 'https://linkedin.com/in/usuario',
    icon: Briefcase,
  },
  {
    platform: 'tiktok',
    label: 'TikTok',
    placeholder: 'https://tiktok.com/@usuario',
    icon: Music2,
  },
  {
    platform: 'youtube',
    label: 'YouTube',
    placeholder: 'https://youtube.com/@usuario',
    icon: Video,
  },
  {
    platform: 'threads',
    label: 'Threads',
    placeholder: 'https://threads.net/@usuario',
    icon: AtSign,
  },
  {
    platform: 'website',
    label: 'Sitio web',
    placeholder: 'https://tusitio.com',
    icon: Globe,
  },
];

function getInitials(
  firstName: string,
  lastName: string,
): string {
  const firstInitial = firstName.trim().charAt(0);
  const lastInitial = lastName.trim().charAt(0);

  return `${firstInitial}${lastInitial}`.toUpperCase() || '?';
}

function getCountryByDialCode(
  dialCode: string | null,
): Country {
  const normalizedDialCode = dialCode
    ? `+${dialCode.replace('+', '')}`
    : '';

  return (
    COUNTRIES.find(
      (country) => country.dialCode === normalizedDialCode,
    ) || COUNTRIES[0]
  );
}

function createEmptySocialLinks(): Record<SocialPlatform, string> {
  return {
    instagram: '',
    facebook: '',
    linkedin: '',
    tiktok: '',
    youtube: '',
    threads: '',
    website: '',
  };
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return (
      url.protocol === 'http:'
      || url.protocol === 'https:'
    );
  } catch {
    return false;
  }
}

export function EditProfilePanel({
  onProfileUpdated,
}: EditProfilePanelProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [occupation, setOccupation] = useState('');
  const [location, setLocation] = useState('');
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);

  const [socialLinks, setSocialLinks] = useState<
    Record<SocialPlatform, string>
  >(createEmptySocialLinks());

  const [initialProfile, setInitialProfile] =
    useState<CurrentUserProfile | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] =
    useState(false);
  const [requestError, setRequestError] = useState('');

  const isEmailValid = useMemo(() => {
    if (!email.trim()) {
      return false;
    }

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email.trim(),
    );
  }, [email]);

  const initials = useMemo(
    () => getInitials(firstName, lastName),
    [firstName, lastName],
  );

  const applyProfile = (profile: CurrentUserProfile) => {
    setInitialProfile(profile);
    setFirstName(profile.first_name || '');
    setLastName(profile.last_name || '');
    setEmail(profile.email || '');
    setPhone(profile.phone_number || '');
    setOccupation(profile.occupation || '');
    setLocation(profile.location || '');

    setCountry(
      getCountryByDialCode(profile.phone_dial_code),
    );

    const nextSocialLinks = createEmptySocialLinks();

    profile.social_links.forEach((socialLink) => {
      nextSocialLinks[socialLink.platform] = socialLink.url;
    });

    setSocialLinks(nextSocialLinks);
  };

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        setIsLoading(true);
        setRequestError('');

        const response = await getCurrentWebProfile();

        if (!isMounted) {
          return;
        }

        applyProfile(response.profile);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setRequestError(
          error instanceof Error
            ? error.message
            : 'No fue posible cargar tu perfil.',
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateSocialLink = (
    platform: SocialPlatform,
    value: string,
  ) => {
    setSocialLinks((currentSocialLinks) => ({
      ...currentSocialLinks,
      [platform]: value,
    }));
  };

  const validateForm = (): string | null => {
    if (!firstName.trim()) {
      return 'Ingresa tu nombre.';
    }

    if (!lastName.trim()) {
      return 'Ingresa tu apellido.';
    }

    if (!isEmailValid) {
      return 'Ingresa un correo electrónico válido.';
    }

    if (!phone.trim()) {
      return 'Ingresa tu número de teléfono.';
    }

    const invalidSocialField = SOCIAL_FIELDS.find((field) => {
      const url = socialLinks[field.platform].trim();

      return url && !isValidUrl(url);
    });

    if (invalidSocialField) {
      return (
        'Ingresa una URL completa y válida para '
        + `${invalidSocialField.label}.`
      );
    }

    return null;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setRequestError(validationError);

      return;
    }

    try {
      setIsSaving(true);
      setRequestError('');

      const payloadSocialLinks = SOCIAL_FIELDS
        .map((field) => ({
          platform: field.platform,
          url: socialLinks[field.platform].trim(),
        }))
        .filter((socialLink) => Boolean(socialLink.url));

      const response = await updateCurrentWebProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone_dial_code: country.dialCode.replace('+', ''),
        phone_number: phone.replace(/\D/g, ''),
        occupation: occupation.trim() || null,
        location: location.trim() || null,
        social_links: payloadSocialLinks,
      });

      applyProfile(response.profile);
      onProfileUpdated?.(response.profile);
      setShowSuccessModal(true);
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : 'No fue posible guardar los cambios.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    if (initialProfile) {
      applyProfile(initialProfile);
    }

    setRequestError('');
    setShowSuccessModal(false);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <div className="flex items-center gap-2 text-sm font-medium text-neutral-500">
          <Loader2 className="h-5 w-5 animate-spin text-brand-primary" />
          <span>Cargando perfil...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="space-y-6 select-none"
      >
        <div className="flex flex-col items-center space-y-2">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-primary text-xl font-bold text-white shadow-md">
            {initials}
          </div>

          <div className="flex items-center gap-1 text-xs font-semibold text-brand-primary">
            <UserCheck className="h-4 w-4" />
            <span>Cuenta Verificada</span>
          </div>
        </div>

        {requestError ? (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{requestError}</span>
          </div>
        ) : null}

        <div className="space-y-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Datos personales
          </span>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700">
              Nombre *
            </label>

            <div className="relative flex items-center">
              <UserRound className="pointer-events-none absolute left-3.5 h-4 w-4 text-neutral-400" />

              <input
                type="text"
                required
                value={firstName}
                onChange={(event) => {
                  setFirstName(event.target.value);
                }}
                placeholder="Ingresa tu nombre"
                disabled={isSaving}
                className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 py-0 pl-10 pr-3.5 text-xs font-normal text-neutral-900 outline-none transition-colors focus:border-brand-primary disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700">
              Apellido *
            </label>

            <div className="relative flex items-center">
              <UserRound className="pointer-events-none absolute left-3.5 h-4 w-4 text-neutral-400" />

              <input
                type="text"
                required
                value={lastName}
                onChange={(event) => {
                  setLastName(event.target.value);
                }}
                placeholder="Ingresa tu apellido"
                disabled={isSaving}
                className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 py-0 pl-10 pr-3.5 text-xs font-normal text-neutral-900 outline-none transition-colors focus:border-brand-primary disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700">
              Correo electrónico *
            </label>

            <div className="relative flex items-center">
              <Mail className="pointer-events-none absolute left-3.5 h-4 w-4 text-neutral-400" />

              <input
                type="email"
                required
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                }}
                placeholder="correo@ejemplo.com"
                disabled={isSaving}
                className={`h-11 w-full rounded-xl border py-0 pl-10 pr-3.5 text-xs font-normal text-neutral-900 outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  !isEmailValid && email.length > 0
                    ? 'border-red-400 bg-red-50/20 focus:border-red-500'
                    : 'border-neutral-200 bg-neutral-50 focus:border-brand-primary'
                }`}
              />
            </div>

            {!isEmailValid && email.length > 0 ? (
              <div className="mt-1 flex items-center gap-1 text-[11px] font-normal text-red-500">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>
                  Ingresa un correo electrónico válido.
                </span>
              </div>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700">
              Número de teléfono *
            </label>

            <div className="flex items-center">
              <CountrySelector
                selectedCountry={country}
                onSelectCountry={setCountry}
              />

              <input
                type="tel"
                required
                value={phone}
                onChange={(event) => {
                  setPhone(
                    event.target.value.replace(/\D/g, ''),
                  );
                }}
                placeholder="300 000 0000"
                disabled={isSaving}
                className="h-12 flex-1 rounded-r-xl border border-l-0 border-neutral-300 bg-white px-3.5 text-xs font-normal text-neutral-900 outline-none transition-colors focus:border-brand-primary disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Información profesional
          </span>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700">
              Ocupación
            </label>

            <div className="relative flex items-center">
              <Briefcase className="pointer-events-none absolute left-3.5 h-4 w-4 text-neutral-400" />

              <input
                type="text"
                value={occupation}
                onChange={(event) => {
                  setOccupation(event.target.value);
                }}
                placeholder="Ej. Desarrollador de software"
                disabled={isSaving}
                className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 py-0 pl-10 pr-3.5 text-xs font-normal text-neutral-900 outline-none transition-colors focus:border-brand-primary disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700">
              Ubicación
            </label>

            <div className="relative flex items-center">
              <MapPin className="pointer-events-none absolute left-3.5 h-4 w-4 text-neutral-400" />

              <input
                type="text"
                value={location}
                onChange={(event) => {
                  setLocation(event.target.value);
                }}
                placeholder="Ej. Bogotá, Colombia"
                disabled={isSaving}
                className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 py-0 pl-10 pr-3.5 text-xs font-normal text-neutral-900 outline-none transition-colors focus:border-brand-primary disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Redes sociales
          </span>

          {SOCIAL_FIELDS.map((field) => {
            const Icon = field.icon;

            return (
              <div
                key={field.platform}
                className="space-y-1"
              >
                <label className="text-xs font-semibold text-neutral-700">
                  {field.label}
                </label>

                <div className="relative flex items-center">
                  <Icon className="pointer-events-none absolute left-3.5 h-4 w-4 text-neutral-400" />

                  <input
                    type="url"
                    value={socialLinks[field.platform]}
                    onChange={(event) => {
                      updateSocialLink(
                        field.platform,
                        event.target.value,
                      );
                    }}
                    placeholder={field.placeholder}
                    disabled={isSaving}
                    className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 py-0 pl-10 pr-3.5 text-xs font-normal text-neutral-900 outline-none transition-colors focus:border-brand-primary disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleDiscard}
            disabled={isSaving}
            className="h-11 flex-1 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Descartar
          </button>

          <button
            type="submit"
            disabled={
              isSaving
              || !firstName.trim()
              || !lastName.trim()
              || !isEmailValid
            }
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-primary text-xs font-semibold text-white shadow-xs transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <span>Guardar cambios</span>
            )}
          </button>
        </div>
      </form>

      {showSuccessModal ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-900/45 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-success-title"
          aria-describedby="profile-success-description"
        >
          <div className="relative w-full max-w-sm rounded-3xl border border-neutral-100 bg-white p-6 text-center shadow-2xl">
            <button
              type="button"
              onClick={() => {
                setShowSuccessModal(false);
              }}
              className="absolute right-4 top-4 rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
              aria-label="Cerrar confirmación"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
              <Check className="h-7 w-7" />
            </div>

            <h2
              id="profile-success-title"
              className="text-base font-semibold text-neutral-900"
            >
              Cambios guardados
            </h2>

            <p
              id="profile-success-description"
              className="mt-2 text-sm font-normal leading-5 text-neutral-600"
            >
              Tu información de perfil fue actualizada correctamente.
            </p>

            <button
              type="button"
              onClick={() => {
                setShowSuccessModal(false);
              }}
              className="mt-6 h-11 w-full rounded-xl bg-brand-primary text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Entendido
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}