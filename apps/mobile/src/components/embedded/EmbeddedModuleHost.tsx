import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@beeapp/design-system';
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
export default function EmbeddedModuleHost({ moduleId, onClose, initialPath, initialParams }: EmbeddedModuleHostProps) {
  const realRouter = useRouter();
  const rootPath = MODULE_ROOTS[moduleId];
  const [stack, setStack] = useState<StackEntry[]>(() => {
    const base: StackEntry[] = [{ path: rootPath, params: {} }];
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
    <View style={styles.card}>
      {/* The module screen itself (with its own single header), driving the internal stack */}
      <EmbeddedNavContext.Provider value={{ nav, params: top.params }}>
        <Screen key={`${top.path}-${stack.length}`} />
      </EmbeddedNavContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    marginHorizontal: 12,
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    overflow: 'hidden',
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
});
