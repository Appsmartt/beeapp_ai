import {
  getCalendarReminderOptions,
  getCommunityCategoryLabels,
  getLandingHero,
  getLegalContent,
  getMobileAppDownloadUrl,
  getNoteCategoryPalette,
  getRegistrationCountries,
  getSupportConfig,
  type CalendarReminderOption,
  type LandingHero,
  type NoteCategoryPalette,
  type RegistrationCountry,
  type SupportFaqItem,
} from '@beeapp/api-client';

export type { RegistrationCountry, SupportFaqItem, CalendarReminderOption, LandingHero, NoteCategoryPalette };

let countriesPromise: Promise<RegistrationCountry[]> | null = null;
let supportPromise: ReturnType<typeof getSupportConfig> | null = null;
let legalPromise: ReturnType<typeof getLegalContent> | null = null;
let palettePromise: Promise<NoteCategoryPalette> | null = null;
let communityLabelsPromise: Promise<string[]> | null = null;
let reminderPromise: Promise<CalendarReminderOption[]> | null = null;
let heroPromise: Promise<LandingHero | null> | null = null;
let mobileUrlPromise: Promise<string> | null = null;

export function loadRegistrationCountries(): Promise<RegistrationCountry[]> {
  if (!countriesPromise) {
    countriesPromise = getRegistrationCountries().catch(() => []);
  }
  return countriesPromise;
}

export function loadSupportConfig() {
  if (!supportPromise) {
    supportPromise = getSupportConfig().catch(() => ({
      faq: [],
      email: '',
      phone: '',
      whatsapp: '',
      supportUrl: '',
      supportChannel: '',
    }));
  }
  return supportPromise;
}

export function loadLegalContent() {
  if (!legalPromise) {
    legalPromise = getLegalContent().catch(() => ({ terms: '', privacy: '' }));
  }
  return legalPromise;
}

export function loadNoteCategoryPalette(): Promise<NoteCategoryPalette> {
  if (!palettePromise) {
    palettePromise = getNoteCategoryPalette().catch(() => ({
      iconKeys: [],
      colors: [],
      fixedCategories: [],
    }));
  }
  return palettePromise;
}

export function loadCommunityCategoryLabels(): Promise<string[]> {
  if (!communityLabelsPromise) {
    communityLabelsPromise = getCommunityCategoryLabels().catch(() => []);
  }
  return communityLabelsPromise;
}

export function loadCalendarReminderOptions(): Promise<CalendarReminderOption[]> {
  if (!reminderPromise) {
    reminderPromise = getCalendarReminderOptions().catch(() => []);
  }
  return reminderPromise;
}

export function loadLandingHero(): Promise<LandingHero | null> {
  if (!heroPromise) {
    heroPromise = getLandingHero().catch(() => null);
  }
  return heroPromise;
}

export function loadMobileAppDownloadUrl(): Promise<string> {
  if (!mobileUrlPromise) {
    mobileUrlPromise = getMobileAppDownloadUrl().catch(() => '');
  }
  return mobileUrlPromise;
}
