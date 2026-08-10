/**
 * Mock store for global App Lock state.
 *
 * Keeps track of whether app lock is enabled, the locking method (biometrics/PIN),
 * the 6-digit lock PIN, and whether the app is currently locked or when it was minimized.
 * Everything lives in memory in mock mode.
 */

export type AppLockMethod = 'biometric' | 'pin' | null;

let appLockEnabled = false;
let appLockMethod: AppLockMethod = null;
let appLockPin: string | null = null;
let isLocked = false;
let lastBackgroundTime: number | null = null;

// Lock settings
export const isAppLockEnabled = () => appLockEnabled;
export const getAppLockMethod = () => appLockMethod;
export const getAppLockPin = () => appLockPin;

export const enableAppLock = (method: 'biometric' | 'pin', pin: string | null = null) => {
  appLockEnabled = true;
  appLockMethod = method;
  if (method === 'pin' && pin) {
    appLockPin = pin;
  } else if (method === 'biometric') {
    appLockPin = null;
  }
};

export const disableAppLock = () => {
  appLockEnabled = false;
  appLockMethod = null;
  appLockPin = null;
  isLocked = false;
  lastBackgroundTime = null;
};

// Lock state
export const getIsLocked = () => isLocked;
export const lockApp = () => {
  if (appLockEnabled) {
    isLocked = true;
  }
};
export const unlockApp = () => {
  isLocked = false;
};

export const verifyAppLockPin = (pin: string) => {
  return appLockPin !== null && pin === appLockPin;
};

// Background timing
export const getLastBackgroundTime = () => lastBackgroundTime;
export const setLastBackgroundTime = (time: number | null) => {
  lastBackgroundTime = time;
};

export const shouldLock = (): boolean => {
  if (!appLockEnabled) return false;
  // Simple check: if minimized, we lock the app.
  return lastBackgroundTime !== null;
};

export const APP_LOCK_PIN_LENGTH = 6;
