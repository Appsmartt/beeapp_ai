import type { AppStateStatus } from 'react-native';

let armed = false;
let cleanupTimer: ReturnType<typeof setTimeout> | null = null;

export function clearLocationPermissionUnlockSkip(): void {
  armed = false;
  if (cleanupTimer) clearTimeout(cleanupTimer);
  cleanupTimer = null;
}

export function armLocationPermissionUnlockSkip(): void {
  clearLocationPermissionUnlockSkip();
  armed = true;
}

export function finishLocationPermissionUnlockSkip(): void {
  if (!armed) return;
  if (cleanupTimer) clearTimeout(cleanupTimer);
  cleanupTimer = setTimeout(clearLocationPermissionUnlockSkip, 1500);
}

export function consumeLocationPermissionUnlockSkip(
  previousAppState: AppStateStatus,
): boolean {
  if (!armed || previousAppState !== 'inactive') return false;
  clearLocationPermissionUnlockSkip();
  return true;
}
