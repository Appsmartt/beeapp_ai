import {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, {
  Path,
} from 'react-native-svg';
import { colors } from '@beeapp/design-system';

import BuddyLogo from '../src/components/BuddyLogo';
import {
  getAuthSession,
} from '../src/services/authSession';
import {
  synchronizeInitialPrivateChats,
  type ChatInitialSyncProgress,
} from '../src/services/chatInitialSync';
import {
  hasAppLockConfigured,
} from '../src/stores/appLockStore';

const {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
} = Dimensions.get('window');

function getLinePath(
  width: number,
  startY: number,
  amplitude: number,
): string {
  return (
    `M 0,${startY} `
    + `Q ${width * 0.25},${startY - amplitude} `
    + `${width * 0.5},${startY} `
    + `T ${width},${startY} `
    + `T ${width * 1.5},${startY} `
    + `T ${width * 2},${startY} `
    + `T ${width * 2.5},${startY} `
    + `T ${width * 3},${startY}`
  );
}

export default function SplashScreen() {
  const router = useRouter();

  const fadeAnim = useRef(
    new Animated.Value(0),
  ).current;

  const wave1Anim = useRef(
    new Animated.Value(0),
  ).current;

  const wave2Anim = useRef(
    new Animated.Value(0),
  ).current;

  const wave3Anim = useRef(
    new Animated.Value(0),
  ).current;

  const wave4Anim = useRef(
    new Animated.Value(0),
  ).current;

  const [syncProgress, setSyncProgress] = useState<
    ChatInitialSyncProgress | null
  >(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.timing(wave1Anim, {
        toValue: 1,
        duration: 16000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    Animated.loop(
      Animated.timing(wave2Anim, {
        toValue: 1,
        duration: 22000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    Animated.loop(
      Animated.timing(wave3Anim, {
        toValue: 1,
        duration: 18000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    Animated.loop(
      Animated.timing(wave4Anim, {
        toValue: 1,
        duration: 26000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    const resolveInitialRoute = async () => {
      const session = await getAuthSession();

      if (!session) {
        router.replace('/(auth)/login');
        return;
      }

      const appLockConfigured =
        await hasAppLockConfigured();

      if (!appLockConfigured) {
        router.replace('/(auth)/app-lock-setup');
        return;
      }

      try {
        await synchronizeInitialPrivateChats(
          setSyncProgress,
        );
      } catch {
        // Un fallo de sincronización no debe impedir entrar a BeeApp.
      }

      router.replace('/onboarding');
    };

    const timer = setTimeout(() => {
      void resolveInitialRoute();
    }, 2500);

    return () => {
      clearTimeout(timer);
    };
  }, [
    fadeAnim,
    router,
    wave1Anim,
    wave2Anim,
    wave3Anim,
    wave4Anim,
  ]);

  const wave1TranslateX = wave1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -SCREEN_WIDTH],
  });

  const wave2TranslateX = wave2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, 0],
  });

  const wave3TranslateX = wave3Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -SCREEN_WIDTH],
  });

  const wave4TranslateX = wave4Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, 0],
  });

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[
            styles.animatedPathWrapper,
            {
              top: SCREEN_HEIGHT * 0.1,
              height: 120,
              transform: [
                {
                  rotate: '-10deg',
                },
                {
                  translateX: wave1TranslateX,
                },
              ],
            },
          ]}
        >
          <Svg
            width={SCREEN_WIDTH * 3}
            height={120}
          >
            <Path
              d={getLinePath(SCREEN_WIDTH, 60, 30)}
              fill="none"
              stroke={colors.brand.primary}
              strokeWidth={1.5}
              opacity={0.07}
            />
          </Svg>
        </Animated.View>

        <Animated.View
          style={[
            styles.animatedPathWrapper,
            {
              top: SCREEN_HEIGHT * 0.32,
              height: 160,
              transform: [
                {
                  rotate: '12deg',
                },
                {
                  translateX: wave2TranslateX,
                },
              ],
            },
          ]}
        >
          <Svg
            width={SCREEN_WIDTH * 3}
            height={160}
          >
            <Path
              d={getLinePath(SCREEN_WIDTH, 80, 45)}
              fill="none"
              stroke={colors.brand.dark}
              strokeWidth={2}
              opacity={0.08}
            />
          </Svg>
        </Animated.View>

        <Animated.View
          style={[
            styles.animatedPathWrapper,
            {
              top: SCREEN_HEIGHT * 0.55,
              height: 140,
              transform: [
                {
                  rotate: '-8deg',
                },
                {
                  translateX: wave3TranslateX,
                },
              ],
            },
          ]}
        >
          <Svg
            width={SCREEN_WIDTH * 3}
            height={140}
          >
            <Path
              d={getLinePath(SCREEN_WIDTH, 70, 35)}
              fill="none"
              stroke={colors.brand.primary}
              strokeWidth={2.5}
              opacity={0.06}
            />
          </Svg>
        </Animated.View>

        <Animated.View
          style={[
            styles.animatedPathWrapper,
            {
              top: SCREEN_HEIGHT * 0.76,
              height: 120,
              transform: [
                {
                  rotate: '15deg',
                },
                {
                  translateX: wave4TranslateX,
                },
              ],
            },
          ]}
        >
          <Svg
            width={SCREEN_WIDTH * 3}
            height={120}
          >
            <Path
              d={getLinePath(SCREEN_WIDTH, 60, 25)}
              fill="none"
              stroke={colors.brand.dark}
              strokeWidth={1}
              opacity={0.11}
            />
          </Svg>
        </Animated.View>
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <BuddyLogo
          size={210}
          showText
        />

        <ActivityIndicator
          size="large"
          color={colors.brand.primary}
          style={styles.spinner}
        />

        <Text style={styles.title}>
          {syncProgress
            ? 'Sincronizando tus chats...'
            : 'Iniciando tu espacio seguro...'}
        </Text>

        <Text style={styles.subtitle}>
          {syncProgress?.phase === 'messages'
            ? (
                `Chats sincronizados: `
                + `${syncProgress.completedConversations} `
                + `de ${syncProgress.totalConversations}`
              )
            : syncProgress?.phase === 'inbox'
              ? 'Preparando tus conversaciones...'
              : syncProgress?.phase === 'preparing'
                ? 'Preparando la sincronización...'
                : 'Todo lo importante, en un solo lugar.'}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 24,
  },
  animatedPathWrapper: {
    left: -SCREEN_WIDTH,
    position: 'absolute',
    width: SCREEN_WIDTH * 3,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    zIndex: 10,
  },
  spinner: {
    marginVertical: 32,
  },
  title: {
    color: colors.brand.primary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.neutral.gray600,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});