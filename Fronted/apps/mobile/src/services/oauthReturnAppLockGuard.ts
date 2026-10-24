import type { AppStateStatus } from 'react-native';

const OAUTH_RETURN_SKIP_TTL_MS = 5 * 60 * 1000;

let oauthReturnUnlockSkipExpiresAt = 0;

export function armOAuthReturnUnlockSkip(): void {
  oauthReturnUnlockSkipExpiresAt = Date.now()
    + OAUTH_RETURN_SKIP_TTL_MS;
}

export function clearOAuthReturnUnlockSkip(): void {
  oauthReturnUnlockSkipExpiresAt = 0;
}

export function consumeOAuthReturnUnlockSkip(
  previousAppState: AppStateStatus,
): boolean {
  const isValidReturnState =
    previousAppState === 'inactive'
    || previousAppState === 'background';

  const isActive = Date.now() <= oauthReturnUnlockSkipExpiresAt;

  clearOAuthReturnUnlockSkip();

  return isValidReturnState && isActive;
}
