import type { AppStateStatus } from 'react-native';

let permissionDialogUnlockSkipArmed = false;
let cleanupTimer: ReturnType<typeof setTimeout> | null = null;

export function clearPermissionDialogUnlockSkip(): void {
  permissionDialogUnlockSkipArmed = false;

  if (cleanupTimer) {
    clearTimeout(cleanupTimer);
  }

  cleanupTimer = null;
}

export function armPermissionDialogUnlockSkip(): void {
  clearPermissionDialogUnlockSkip();
  permissionDialogUnlockSkipArmed = true;
}

export function isPermissionDialogUnlockSkipArmed(): boolean {
  return permissionDialogUnlockSkipArmed;
}

export function finishPermissionDialogUnlockSkip(): void {
  if (!permissionDialogUnlockSkipArmed) {
    return;
  }

  if (cleanupTimer) {
    clearTimeout(cleanupTimer);
  }

  cleanupTimer = setTimeout(
    clearPermissionDialogUnlockSkip,
    1500,
  );
}

export function consumePermissionDialogUnlockSkip(
  previousAppState: AppStateStatus,
): boolean {
  if (
    !permissionDialogUnlockSkipArmed
    || previousAppState !== 'inactive'
  ) {
    return false;
  }

  clearPermissionDialogUnlockSkip();
  return true;
}

export const clearLocationPermissionUnlockSkip =
  clearPermissionDialogUnlockSkip;

export const armLocationPermissionUnlockSkip =
  armPermissionDialogUnlockSkip;

export const finishLocationPermissionUnlockSkip =
  finishPermissionDialogUnlockSkip;

export const consumeLocationPermissionUnlockSkip =
  consumePermissionDialogUnlockSkip;

export const armCallPermissionUnlockSkip =
  armPermissionDialogUnlockSkip;

export const finishCallPermissionUnlockSkip =
  finishPermissionDialogUnlockSkip;
