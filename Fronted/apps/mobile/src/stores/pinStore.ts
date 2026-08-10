/**
 * Mock global PIN protection state.
 * A single 4-digit PIN protects every item marked as protected (files,
 * folders and notes). Everything lives in memory: no encryption, no
 * secure storage and no backend — that arrives with the real integration.
 */

let currentPin: string | null = '1234';

export const getPin = () => currentPin;
export const hasPin = () => currentPin !== null;
export const setPin = (pin: string | null) => {
  currentPin = pin;
};
export const isPinCorrect = (pin: string) => currentPin !== null && pin === currentPin;

/** Ids of protected elements (storage items, notes and chats share this list) */
let protectedIds: string[] = ['n4', '1', '2'];

export const getProtectedIds = () => protectedIds;
export const isProtected = (id: string) => protectedIds.includes(id);
export const setProtected = (id: string, value: boolean) => {
  protectedIds = value ? [...protectedIds, id] : protectedIds.filter((x) => x !== id);
  return protectedIds;
};

export const PIN_LENGTH = 4;
/** Mock SMS code used by the "forgot your PIN" recovery flow */
export const RECOVERY_CODE_LENGTH = 6;
export const MOCK_RECOVERY_PHONE = '+57 300 ••• 45 67';
