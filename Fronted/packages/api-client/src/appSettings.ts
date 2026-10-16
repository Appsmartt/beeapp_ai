import { getSupabase } from './supabase';

export type AppSettingsMap = Record<string, string>;

export type SupportFaqItem = { q: string; a: string };

export type RegistrationCountry = {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
};

export type NoteCategoryPalette = {
  iconKeys: string[];
  colors: string[];
  fixedCategories: Array<{
    id: string;
    name: string;
    iconKey: string;
    color: string;
    isFixed?: boolean;
  }>;
};

export type CalendarReminderOption = { value: string; label: string };

export type LandingHero = { badge: string; title: string; subtitle: string };

export type PublicPlan = {
  id: string;
  name: string;
  description: string | null;
  monthly_price: number;
  yearly_price: number;
  storage_gb: number;
  device_limit: number;
  offer_limit: number;
  features: unknown;
  highlights: string[] | null;
  color: string | null;
  sort_order: number;
  is_active: boolean;
};

export type MySubscriptionPayload = {
  subscription: Record<string, unknown> | null;
  plan: PublicPlan | null;
};

function parseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw?.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function getAppSettings(keys: string[]): Promise<AppSettingsMap> {
  const { data, error } = await getSupabase().rpc('get_app_settings', {
    p_keys: keys,
  });

  if (error) {
    throw new Error(error.message);
  }

  const map = (data ?? {}) as Record<string, unknown>;
  const out: AppSettingsMap = {};
  for (const [key, value] of Object.entries(map)) {
    out[key] = typeof value === 'string' ? value : JSON.stringify(value);
  }
  return out;
}

export async function getLegalContent(): Promise<{ terms: string; privacy: string }> {
  const settings = await getAppSettings(['terms', 'privacy']);
  return {
    terms: settings.terms ?? '',
    privacy: settings.privacy ?? '',
  };
}

export async function getSupportConfig(): Promise<{
  faq: SupportFaqItem[];
  email: string;
  phone: string;
  whatsapp: string;
  supportUrl: string;
  supportChannel: string;
}> {
  const settings = await getAppSettings([
    'support_faq',
    'support_email',
    'support_phone',
    'support_whatsapp',
    'support_url',
    'support_channel',
  ]);

  return {
    faq: parseJson<SupportFaqItem[]>(settings.support_faq, []),
    email: settings.support_email ?? '',
    phone: settings.support_phone ?? '',
    whatsapp: settings.support_whatsapp ?? '',
    supportUrl: settings.support_url ?? '',
    supportChannel: settings.support_channel ?? '',
  };
}

export async function getRegistrationCountries(): Promise<RegistrationCountry[]> {
  const settings = await getAppSettings(['registration_countries']);
  return parseJson<RegistrationCountry[]>(settings.registration_countries, []);
}

export async function getNoteCategoryPalette(): Promise<NoteCategoryPalette> {
  const settings = await getAppSettings(['note_category_palette']);
  return parseJson<NoteCategoryPalette>(settings.note_category_palette, {
    iconKeys: [],
    colors: [],
    fixedCategories: [],
  });
}

export async function getCommunityCategoryLabels(): Promise<string[]> {
  const settings = await getAppSettings(['community_category_labels']);
  return parseJson<string[]>(settings.community_category_labels, []);
}

export async function getCalendarReminderOptions(): Promise<CalendarReminderOption[]> {
  const settings = await getAppSettings(['calendar_reminder_options']);
  return parseJson<CalendarReminderOption[]>(settings.calendar_reminder_options, []);
}

export async function getLandingHero(): Promise<LandingHero | null> {
  const settings = await getAppSettings(['landing_hero']);
  const hero = parseJson<LandingHero | null>(settings.landing_hero, null);
  if (!hero?.title) return null;
  return hero;
}

export async function getMobileAppDownloadUrl(): Promise<string> {
  const settings = await getAppSettings(['mobile_app_download_url']);
  return settings.mobile_app_download_url ?? '';
}

export async function getMySubscription(): Promise<MySubscriptionPayload> {
  const { data, error } = await getSupabase().rpc('get_my_subscription');

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? { subscription: null, plan: null }) as MySubscriptionPayload;
}

export async function listPublicPlans(): Promise<PublicPlan[]> {
  const { data, error } = await getSupabase().rpc('list_public_plans');

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as PublicPlan[];
}
