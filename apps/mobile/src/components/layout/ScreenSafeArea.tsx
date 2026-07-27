import { View, ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useModuleNav } from '../embedded/EmbeddedNavContext';

/**
 * Screen shell that keeps the content below the status bar / notch.
 *
 * React Native's own SafeAreaView is a no-op on Android, so every screen uses
 * this one instead: the top padding is always the device inset reported by
 * react-native-safe-area-context, never a hardcoded value.
 *
 * Module screens rendered inside the Home (EmbeddedModuleHost) get no inset:
 * the Home already pushed everything below the status bar.
 */
export default function ScreenSafeArea({ style, children, ...rest }: ViewProps) {
  const insets = useSafeAreaInsets();
  const { embedded } = useModuleNav();

  return (
    <View style={[style, { paddingTop: embedded ? 0 : insets.top }]} {...rest}>
      {children}
    </View>
  );
}
