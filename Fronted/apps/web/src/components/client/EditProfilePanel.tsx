'use client';

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertCircle,
  AtSign,
  Briefcase,
  Camera,
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

import CountrySelector, { type Country } from '@/components/auth/CountrySelector';
import ProfileAvatar from '@/components/client/ProfileAvatar';
import { loadRegistrationCountries } from '@/lib/client/publicAppSettings';
import {
  removeCurrentProfileAvatar,
  resolveProfileAvatarUrl,
  uploadAndAssignProfileAvatar,
} from '@/lib/client/profileAvatarService';
import { getWebAuth } from '@/lib/client/webAuth';

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
  countries: Country[],
): Country | null {
  const normalizedDialCode = dialCode
    ? `+${dialCode.replace('+', '')}`
    : '';

  return (
    countries.find(
      (country) => country.dialCode === normalizedDialCode,
    ) || countries[0] || null
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

const inputClass =
  'h-12 w-full rounded-xl border border-[#E4D8F2] bg-[#FCFAFF] py-0 pl-11 pr-3.5 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-brand-primary focus:bg-white focus:ring-4 focus:ring-brand-primary/10 disabled:cursor-not-allowed disabled:opacity-60';

function ProfileSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[#E7DFF3] bg-white p-5 shadow-[0_8px_24px_rgba(96,37,210,0.05)] sm:p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
        <p className="mt-1 text-sm leading-5 text-[#6B5B8A]">{description}</p>
      </div>
      {children}
    </section>
  );
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
  const [countries, setCountries] = useState<Country[]>([]);
  const [country, setCountry] = useState<Country | null>(null);

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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [pendingAvatarPreview, setPendingAvatarPreview] =
    useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const isAvatarBusy = isUploadingAvatar || isRemovingAvatar;

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

  const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'Tu perfil';

  const visibleAvatarUrl = pendingAvatarPreview || avatarUrl;

  const isVerified = initialProfile?.verification_status === 'verificado';

  const hasExistingAvatar = Boolean(
    initialProfile?.avatar_file_id || avatarUrl,
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
      getCountryByDialCode(profile.phone_dial_code, countries),
    );

    const nextSocialLinks = createEmptySocialLinks();

    profile.social_links.forEach((socialLink) => {
      nextSocialLinks[socialLink.platform] = socialLink.url;
    });

    setSocialLinks(nextSocialLinks);
  };

  useEffect(() => {
    void loadRegistrationCountries().then(setCountries);
  }, []);

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

        try {
          const auth = await getWebAuth();
          const resolvedAvatarUrl = await resolveProfileAvatarUrl(
            response.profile,
            auth,
          );

          if (isMounted) {
            setAvatarUrl(resolvedAvatarUrl);
          }
        } catch {
          if (isMounted) {
            setAvatarUrl(response.profile.avatar_url?.trim() || null);
          }
        }
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

      if (!country) {
        setRequestError('Lista de países no disponible.');
        return;
      }

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
    setPendingAvatarPreview(null);
  };

  const handleAvatarInputChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || isSaving || isAvatarBusy) {
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPendingAvatarPreview(previewUrl);

    try {
      setIsUploadingAvatar(true);
      setRequestError('');

      const auth = await getWebAuth();
      const avatarResult = await uploadAndAssignProfileAvatar(
        auth,
        file,
      );

      applyProfile(avatarResult.profile);
      setAvatarUrl(avatarResult.avatarUrl);
      setPendingAvatarPreview(null);
      onProfileUpdated?.(avatarResult.profile);
    } catch (error) {
      setPendingAvatarPreview(null);
      setRequestError(
        error instanceof Error
          ? error.message
          : 'No fue posible guardar la foto de perfil.',
      );
    } finally {
      URL.revokeObjectURL(previewUrl);
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (
      !initialProfile?.avatar_file_id
      || isSaving
      || isAvatarBusy
    ) {
      return;
    }

    const confirmed = window.confirm(
      'Tu foto dejará de mostrarse en tu perfil. ¿Quitar foto?',
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsRemovingAvatar(true);
      setRequestError('');

      const auth = await getWebAuth();
      const updatedProfile = await removeCurrentProfileAvatar(auth);

      applyProfile(updatedProfile);
      setAvatarUrl(null);
      setPendingAvatarPreview(null);
      onProfileUpdated?.(updatedProfile);
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : 'No fue posible quitar la foto de perfil.',
      );
    } finally {
      setIsRemovingAvatar(false);
    }
  };

  const openAvatarPicker = () => {
    if (isSaving || isAvatarBusy) {
      return;
    }

    avatarInputRef.current?.click();
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-3xl border border-[#E7DFF3] bg-white">
        <div className="flex items-center gap-2 text-sm font-medium text-[#6B5B8A]">
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
        className="space-y-5 select-none"
      >
        <section className="overflow-hidden rounded-3xl border border-[#E7DFF3] bg-white shadow-[0_8px_24px_rgba(96,37,210,0.05)]">
          <div className="h-24 bg-gradient-to-r from-[#6025d2] via-[#7B4AD8] to-[#C4B5E8]" />
          <div className="px-5 pb-6 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    void handleAvatarInputChange(event);
                  }}
                />

                <button
                  type="button"
                  onClick={openAvatarPicker}
                  disabled={isSaving || isAvatarBusy}
                  className="relative -mt-10 shrink-0 rounded-full ring-4 ring-white disabled:opacity-60"
                >
                  <ProfileAvatar
                    initials={initials}
                    avatarUrl={visibleAvatarUrl}
                    size="lg"
                    className="shadow-md"
                  />

                  <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand-primary text-white shadow-sm">
                    {isAvatarBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </span>
                </button>

                <div className="min-w-0 pb-1 pt-3">
                  <h2 className="truncate text-lg font-semibold text-neutral-900">
                    {displayName}
                  </h2>
                  <p className="truncate text-sm text-[#6B5B8A]">
                    {email || 'Agrega tu correo'}
                  </p>
                  {isVerified ? (
                    <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[#F3EDFF] px-2.5 py-1 text-xs font-medium text-brand-primary">
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>Cuenta verificada</span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openAvatarPicker}
                  disabled={isSaving || isAvatarBusy}
                  className="h-10 rounded-xl bg-brand-primary px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
                >
                  {isUploadingAvatar
                    ? 'Subiendo foto...'
                    : isRemovingAvatar
                      ? 'Quitando foto...'
                      : visibleAvatarUrl
                        ? 'Cambiar foto'
                        : 'Agregar foto'}
                </button>

                {hasExistingAvatar || pendingAvatarPreview ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleRemoveAvatar();
                    }}
                    disabled={isSaving || isAvatarBusy}
                    className="h-10 rounded-xl border border-[#E4D8F2] px-4 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                  >
                    Quitar foto
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {requestError ? (
          <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{requestError}</span>
          </div>
        ) : null}

        <ProfileSection
          title="Datos personales"
          description="Nombre, correo y teléfono con los que inicias sesión."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-800">
                Nombre *
              </label>
              <div className="relative flex items-center">
                <UserRound className="pointer-events-none absolute left-3.5 h-4 w-4 text-[#8B7AA8]" />
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(event) => {
                    setFirstName(event.target.value);
                  }}
                  placeholder="Ingresa tu nombre"
                  disabled={isSaving}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-800">
                Apellido *
              </label>
              <div className="relative flex items-center">
                <UserRound className="pointer-events-none absolute left-3.5 h-4 w-4 text-[#8B7AA8]" />
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(event) => {
                    setLastName(event.target.value);
                  }}
                  placeholder="Ingresa tu apellido"
                  disabled={isSaving}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-medium text-neutral-800">
                Correo electrónico *
              </label>
              <div className="relative flex items-center">
                <Mail className="pointer-events-none absolute left-3.5 h-4 w-4 text-[#8B7AA8]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                  }}
                  placeholder="correo@ejemplo.com"
                  disabled={isSaving}
                  className={`${inputClass} ${
                    !isEmailValid && email.length > 0
                      ? 'border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-red-500/10'
                      : ''
                  }`}
                />
              </div>
              {!isEmailValid && email.length > 0 ? (
                <div className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Ingresa un correo electrónico válido.</span>
                </div>
              ) : null}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-medium text-neutral-800">
                Número de teléfono *
              </label>
              <div
                className={`flex h-12 items-stretch overflow-hidden rounded-xl border bg-[#FCFAFF] transition-colors focus-within:border-brand-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-primary/10 ${
                  isSaving
                    ? 'cursor-not-allowed opacity-60'
                    : 'border-[#E4D8F2]'
                }`}
              >
                <CountrySelector
                  variant="inline"
                  disabled={isSaving}
                  countries={countries}
                  selectedCountry={country}
                  onSelectCountry={setCountry}
                />
                <div className="my-2.5 w-px shrink-0 bg-[#E4D8F2]" aria-hidden />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value.replace(/\D/g, ''));
                  }}
                  placeholder="300 000 0000"
                  disabled={isSaving}
                  className="min-w-0 flex-1 border-0 bg-transparent px-3.5 text-sm text-neutral-900 outline-none ring-0 placeholder:text-neutral-400 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </ProfileSection>

        <ProfileSection
          title="Información profesional"
          description="Aparece en tu perfil cuando alguien abre tu contacto."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-800">
                Ocupación
              </label>
              <div className="relative flex items-center">
                <Briefcase className="pointer-events-none absolute left-3.5 h-4 w-4 text-[#8B7AA8]" />
                <input
                  type="text"
                  value={occupation}
                  onChange={(event) => {
                    setOccupation(event.target.value);
                  }}
                  placeholder="Ej. Desarrollador de software"
                  disabled={isSaving}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-800">
                Ubicación
              </label>
              <div className="relative flex items-center">
                <MapPin className="pointer-events-none absolute left-3.5 h-4 w-4 text-[#8B7AA8]" />
                <input
                  type="text"
                  value={location}
                  onChange={(event) => {
                    setLocation(event.target.value);
                  }}
                  placeholder="Ej. Bogotá, Colombia"
                  disabled={isSaving}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </ProfileSection>

        <ProfileSection
          title="Redes sociales"
          description="Enlaces públicos. Déjalos vacíos si no quieres mostrarlos."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {SOCIAL_FIELDS.map((field) => {
              const Icon = field.icon;

              return (
                <div key={field.platform} className="space-y-1.5">
                  <label className="text-sm font-medium text-neutral-800">
                    {field.label}
                  </label>
                  <div className="relative flex items-center">
                    <Icon className="pointer-events-none absolute left-3.5 h-4 w-4 text-[#8B7AA8]" />
                    <input
                      type="url"
                      value={socialLinks[field.platform]}
                      onChange={(event) => {
                        updateSocialLink(field.platform, event.target.value);
                      }}
                      placeholder={field.placeholder}
                      disabled={isSaving}
                      className={inputClass}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ProfileSection>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleDiscard}
            disabled={isSaving}
            className="h-12 rounded-xl border border-[#E4D8F2] bg-white px-5 text-sm font-medium text-neutral-700 transition-colors hover:bg-[#F7F2FC] disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-36"
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
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-primary px-6 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(96,37,210,0.25)] transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-44"
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