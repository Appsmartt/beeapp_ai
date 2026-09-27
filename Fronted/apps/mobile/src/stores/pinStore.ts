/**
 * Temporary local selection of items marked in storage.
 * PIN configuration and verification happen through the account API.
 * This list is not persistent access control.
 */
let protectedIds: string[] = [];

export const getProtectedIds = () => protectedIds;
export const isProtected = (id: string) => protectedIds.includes(id);
export const setProtected = (id: string, value: boolean) => {
  protectedIds = value ? [...protectedIds, id] : protectedIds.filter((x) => x !== id);
  return protectedIds;
};

export const PIN_LENGTH = 4;
