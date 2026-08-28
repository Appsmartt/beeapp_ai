import type {
  CallCredentialsResponse,
} from '@beeapp/api-client';

let activeCallCredentials: CallCredentialsResponse | null = null;

export function setActiveCallCredentials(
  value: CallCredentialsResponse,
): void {
  activeCallCredentials = value;
}

export function getActiveCallCredentials(): CallCredentialsResponse | null {
  return activeCallCredentials;
}

export function clearActiveCallCredentials(
  callId?: string,
): void {
  if (
    !callId
    || activeCallCredentials?.call.id === callId
  ) {
    activeCallCredentials = null;
  }
}
