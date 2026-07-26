import { createContext, useContext } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';

/**
 * Navigation shim for module screens so they can run in two modes:
 * - Standalone (as Expo Router routes): falls back to the real router.
 * - Embedded inside Home (EmbeddedModuleHost): navigates an internal stack
 *   without ever leaving the Home screen.
 *
 * The nav object mirrors the router API shape used by the screens
 * (push/replace accept a path string or { pathname, params }).
 */

export type NavTarget = string | { pathname: string; params?: Record<string, any> };

export interface ModuleNav {
  embedded: boolean;
  /** False at the root of an embedded module: the screen must hide its back button */
  canGoBack: boolean;
  push: (target: NavTarget) => void;
  replace: (target: NavTarget) => void;
  back: () => void;
}

export interface EmbeddedNavValue {
  nav: ModuleNav;
  params: Record<string, any>;
}

export const EmbeddedNavContext = createContext<EmbeddedNavValue | null>(null);

export function useModuleNav(): ModuleNav {
  const ctx = useContext(EmbeddedNavContext);
  const router = useRouter();
  if (ctx) return ctx.nav;
  return {
    embedded: false,
    canGoBack: true,
    push: (target) => router.push(target as any),
    replace: (target) => router.replace(target as any),
    back: () => router.back(),
  };
}

/** Route params: from the embedded stack entry, or the real URL when standalone. */
export function useScreenParams(): Record<string, any> {
  const ctx = useContext(EmbeddedNavContext);
  const routeParams = useLocalSearchParams();
  return ctx ? ctx.params : routeParams;
}
