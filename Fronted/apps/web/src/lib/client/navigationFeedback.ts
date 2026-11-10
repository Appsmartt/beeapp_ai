export const NAVIGATION_START_EVENT = 'buddy:navigation-start';

export function beginAppNavigation() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(NAVIGATION_START_EVENT));
}
