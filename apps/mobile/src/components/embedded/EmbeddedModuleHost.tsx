import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { EmbeddedNavContext, ModuleNav, NavTarget } from './EmbeddedNavContext';
import { EMBEDDED_SCREENS, MODULE_ROOTS } from './embeddedRegistry';

interface StackEntry {
  path: string;
  params: Record<string, any>;
}

interface EmbeddedModuleHostProps {
  moduleId: string;
  /** When omitted the module is always on screen (Home): no close button */
  onClose?: () => void;
  /** Optional inner screen to open on top of the module root (e.g. a specific email) */
  initialPath?: string;
  initialParams?: Record<string, any>;
  /** Params handed to the module root screen (used by the overview) */
  rootParams?: Record<string, any>;
}

const normalize = (target: NavTarget): StackEntry =>
  typeof target === 'string'
    ? { path: target, params: {} }
    : { path: target.pathname, params: target.params ?? {} };

/**
 * Renders a full module inside the Home screen with its own internal
 * navigation stack: list -> detail -> etc. never leaves the Home route.
 * Paths outside the embedded registry close the module and use the real router.
 */
export default function EmbeddedModuleHost({ moduleId, onClose, initialPath, initialParams, rootParams }: EmbeddedModuleHostProps) {
  const realRouter = useRouter();
  const rootPath = MODULE_ROOTS[moduleId];
  const [stack, setStack] = useState<StackEntry[]>(() => {
    const base: StackEntry[] = [{ path: rootPath, params: rootParams ?? {} }];
    // Open directly on an inner screen (root stays below so "back" lands on the list)
    if (initialPath && initialPath !== rootPath && EMBEDDED_SCREENS[initialPath]) {
      base.push({ path: initialPath, params: initialParams ?? {} });
    }
    return base;
  });

  const top = stack[stack.length - 1];
  const Screen = EMBEDDED_SCREENS[top.path];

  const nav: ModuleNav = {
    embedded: true,
    // At the module root there is nothing to go back to: screens hide their arrow
    canGoBack: stack.length > 1,
    push: (target) => {
      const entry = normalize(target);
      if (EMBEDDED_SCREENS[entry.path]) {
        setStack((s) => [...s, entry]);
      } else {
        onClose?.();
        realRouter.push(target as any);
      }
    },
    replace: (target) => {
      const entry = normalize(target);
      if (EMBEDDED_SCREENS[entry.path]) {
        setStack((s) => [...s.slice(0, -1), entry]);
      } else {
        onClose?.();
        realRouter.replace(target as any);
      }
    },
    back: () => {
      if (stack.length > 1) {
        setStack((s) => s.slice(0, -1));
      } else {
        onClose?.();
      }
    },
  };

  if (!Screen) return null;

  return (
    <View style={styles.host}>
      {/* The module screen itself (with its own single header), driving the internal stack */}
      <EmbeddedNavContext.Provider value={{ nav, params: top.params }}>
        <Screen key={`${top.path}-${stack.length}`} />
      </EmbeddedNavContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  // No card: the module flows straight below the chips, seamless with the Home
  host: {
    flex: 1,
  },
});
