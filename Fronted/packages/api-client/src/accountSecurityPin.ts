import type { AuthCredentials } from '@beeapp/shared-types';

import { api } from './client';

export interface AccountSecurityPinStatus {
  configured: boolean;
}

export interface AccountSecurityPinVerification {
  verified: boolean;
}

export function getAccountSecurityPinStatus(
  auth: AuthCredentials,
): Promise<AccountSecurityPinStatus> {
  return api.get<AccountSecurityPinStatus>(
    '/accounts/me/security-pin/',
    { auth },
  );
}

export function configureAccountSecurityPin(
  auth: AuthCredentials,
  pin: string,
): Promise<AccountSecurityPinStatus> {
  return api.post<AccountSecurityPinStatus>(
    '/accounts/me/security-pin/configure/',
    { pin },
    { auth },
  );
}

export function verifyAccountSecurityPin(
  auth: AuthCredentials,
  pin: string,
): Promise<AccountSecurityPinVerification> {
  return api.post<AccountSecurityPinVerification>(
    '/accounts/me/security-pin/verify/',
    { pin },
    { auth },
  );
}


export function verifyAccountSecurityPinPassword(
  auth: AuthCredentials,
  password: string,
): Promise<AccountSecurityPinVerification> {
  return api.post<AccountSecurityPinVerification>(
    '/accounts/me/security-pin/verify-password/',
    { password },
    { auth },
  );
}

export function replaceAccountSecurityPin(
  auth: AuthCredentials,
  password: string,
  pin: string,
): Promise<AccountSecurityPinStatus> {
  return api.post<AccountSecurityPinStatus>(
    '/accounts/me/security-pin/replace/',
    { password, pin },
    { auth },
  );
}
