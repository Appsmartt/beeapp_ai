import type { AppStateStatus } from 'react-native';

const EXTERNAL_ACTIVITY_GRACE_MS = 1500;

let activityCount = 0;
let graceTimer: ReturnType<typeof setTimeout> | null = null;

function clearGraceTimer(): void {
  if (graceTimer) {
    clearTimeout(graceTimer);
  }

  graceTimer = null;
}

function beginExternalActivity(): void {
  clearGraceTimer();
  activityCount += 1;
}

function endExternalActivity(): void {
  activityCount = Math.max(0, activityCount - 1);

  if (activityCount > 0) {
    return;
  }

  clearGraceTimer();
  graceTimer = setTimeout(() => {
    graceTimer = null;
  }, EXTERNAL_ACTIVITY_GRACE_MS);
}

export function isExternalActivityActive(): boolean {
  return activityCount > 0 || graceTimer !== null;
}

export async function withExternalActivity<T>(
  task: () => Promise<T>,
): Promise<T> {
  beginExternalActivity();

  try {
    return await task();
  } finally {
    endExternalActivity();
  }
}

export function clearPermissionDialogUnlockSkip(): void {
  activityCount = 0;
  clearGraceTimer();
}

export function armPermissionDialogUnlockSkip(): void {
  beginExternalActivity();
}

export function isPermissionDialogUnlockSkipArmed(): boolean {
  return isExternalActivityActive();
}

export function finishPermissionDialogUnlockSkip(): void {
  if (activityCount <= 0) {
    return;
  }

  endExternalActivity();
}

export function consumePermissionDialogUnlockSkip(
  previousAppState: AppStateStatus,
): boolean {
  if (
    !isExternalActivityActive()
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
