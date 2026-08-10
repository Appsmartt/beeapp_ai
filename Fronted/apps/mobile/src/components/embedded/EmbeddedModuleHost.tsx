import { useState, useEffect } from 'react';
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
  onClose?: () => void;
  initialPath?: string;
  initialParams?: Record<string, any>;
  rootParams?: Record<string, any>;
  /** Notifies Home screen of navigation depth (0 = root list, >0 = detail screen) */
  onStackDepthChange?: (depth: number) => void;
}

const normalize = (target: NavTarget): StackEntry =>
  typeof target === 'string'
    ? { path: target, params: {} }
    : { path: target.pathname, params: target.params ?? {} };

export default function EmbeddedModuleHost({
  moduleId,
  onClose,
  initialPath,
  initialParams,
  rootParams,
  onStackDepthChange,
}: EmbeddedModuleHostProps) {
  const realRouter = useRouter();
  const rootPath = MODULE_ROOTS[moduleId];
  const [stack, setStack] = useState<StackEntry[]>(() => {
    const base: StackEntry[] = [{ path: rootPath, params: rootParams ?? {} }];
    if (initialPath && initialPath !== rootPath && EMBEDDED_SCREENS[initialPath]) {
      base.push({ path: initialPath, params: initialParams ?? {} });
    }
    return base;
  });

  useEffect(() => {
    onStackDepthChange?.(stack.length - 1);
  }, [stack.length, onStackDepthChange]);

  const top = stack[stack.length - 1];
  const Screen = EMBEDDED_SCREENS[top.path];

  const nav: ModuleNav = {
    embedded: true,
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
      <EmbeddedNavContext.Provider value={{ nav, params: top.params }}>
        <Screen key={`${top.path}-${stack.length}`} />
      </EmbeddedNavContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
});
