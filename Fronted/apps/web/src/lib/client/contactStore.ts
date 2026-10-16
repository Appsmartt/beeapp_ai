import type { ContactItem } from './contacts';

let contacts: ContactItem[] = [];
const listeners = new Set<() => void>();

export function replaceLoadedContacts(next: ContactItem[]): void {
  contacts = next;
  listeners.forEach((listener) => listener());
}

export function readLoadedContacts(): ContactItem[] {
  return contacts;
}

export function subscribeLoadedContacts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
