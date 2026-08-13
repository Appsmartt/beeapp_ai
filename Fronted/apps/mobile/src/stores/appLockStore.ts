import * as SecureStore from 'expo-secure-store';

export const APP_LOCK_PIN_LENGTH = 6;

const APP_LOCK_STORAGE_KEY = 'beeapp.app-lock.config';

export type AppLockMethod =
  | 'fingerprint'
  | 'faceid'
  | 'pin';

type AppLockConfig = {
  method: AppLockMethod;
  pin: string | null;
  failedAttempts: number;
};

function isValidConfig(
  value: unknown,
): value is AppLockConfig {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const config = value as Partial<AppLockConfig>;

  return (
    (
      config.method === 'fingerprint'
      || config.method === 'faceid'
      || config.method === 'pin'
    )
    && (
      typeof config.pin === 'string'
      || config.pin === null
    )
    && typeof config.failedAttempts === 'number'
  );
}

async function readConfig(): Promise<AppLockConfig | null> {
  const rawConfig = await SecureStore.getItemAsync(
    APP_LOCK_STORAGE_KEY,
  );

  if (!rawConfig) {
    return null;
  }

  try {
    const parsedConfig: unknown = JSON.parse(rawConfig);

    if (!isValidConfig(parsedConfig)) {
      await clearAppLockConfig();
      return null;
    }

    return parsedConfig;
  } catch {
    await clearAppLockConfig();
    return null;
  }
}

async function writeConfig(
  config: AppLockConfig,
): Promise<void> {
  await SecureStore.setItemAsync(
    APP_LOCK_STORAGE_KEY,
    JSON.stringify(config),
  );
}

export async function getAppLockConfig(): Promise<AppLockConfig | null> {
  return readConfig();
}

export async function hasAppLockConfigured(): Promise<boolean> {
  const config = await readConfig();
  return config !== null;
}

export async function getAppLockMethod(): Promise<AppLockMethod | null> {
  const config = await readConfig();
  return config?.method ?? null;
}

export async function enableAppLock(
  method: AppLockMethod,
  pin: string | null = null,
): Promise<void> {
  if (
    method === 'pin'
    && (!pin || pin.length !== APP_LOCK_PIN_LENGTH)
  ) {
    throw new Error(
      'El PIN de bloqueo debe tener 6 dígitos.',
    );
  }

  await writeConfig({
    method,
    pin: method === 'pin' ? pin : null,
    failedAttempts: 0,
  });
}

export async function verifyAppLockPin(
  pin: string,
): Promise<boolean> {
  const config = await readConfig();

  return Boolean(
    config?.method === 'pin'
    && config.pin
    && config.pin === pin,
  );
}

export async function registerAppLockFailure(): Promise<number> {
  const config = await readConfig();

  if (!config) {
    return 0;
  }

  const failedAttempts = config.failedAttempts + 1;

  await writeConfig({
    ...config,
    failedAttempts,
  });

  return failedAttempts;
}

export async function resetAppLockFailures(): Promise<void> {
  const config = await readConfig();

  if (!config || config.failedAttempts === 0) {
    return;
  }

  await writeConfig({
    ...config,
    failedAttempts: 0,
  });
}

export async function clearAppLockConfig(): Promise<void> {
  await SecureStore.deleteItemAsync(
    APP_LOCK_STORAGE_KEY,
  );
}