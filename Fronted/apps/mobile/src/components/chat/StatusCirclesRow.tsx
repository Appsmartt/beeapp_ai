import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  useEffect,
  useRef,
} from 'react';
import {
  colors,
} from '@beeapp/design-system';
import {
  Plus,
} from 'lucide-react-native';

import {
  StatusItem,
} from '../../mocks/statuses';
import {
  CURRENT_USER,
} from '../../mocks/currentUser';

interface StatusCirclesRowProps {
  statuses: StatusItem[];
  showLoadingPlaceholders?: boolean;
  onCreate: () => void;
  onOpen: (index: number) => void;
}

const LOADING_PLACEHOLDERS = [0, 1, 2];

function StatusLoadingPlaceholders() {
  const opacity = useRef(
    new Animated.Value(0.42),
  ).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.82,
          duration: 720,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(opacity, {
          toValue: 0.42,
          duration: 720,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [
    opacity,
  ]);

  return (
    <>
      {LOADING_PLACEHOLDERS.map((placeholder) => (
        <Animated.View
          key={placeholder}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={[
            styles.itemWrap,
            styles.placeholderWrap,
            {
              opacity,
            },
          ]}
        >
          <View style={styles.placeholderCard} />
          <View style={styles.placeholderLabel} />
        </Animated.View>
      ))}
    </>
  );
}

/**
 * Statuses above the chat list: horizontal row of circular avatars.
 * The first circle is the current user, with a + badge to publish a new one.
 */
export default function StatusCirclesRow({
  statuses,
  showLoadingPlaceholders = false,
  onCreate,
  onOpen,
}: StatusCirclesRowProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.itemWrap}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onCreate}
            accessibilityLabel="Crear tu estado"
          >
            <View style={styles.userCircle}>
              <Text style={styles.userText}>
                {CURRENT_USER.initials}
              </Text>
              <View style={styles.addBadge}>
                <Plus
                  size={10}
                  color={colors.neutral.white}
                  strokeWidth={3}
                />
              </View>
            </View>
          </TouchableOpacity>
          <Text style={styles.name} numberOfLines={1}>
            Tu estado
          </Text>
        </View>

        {showLoadingPlaceholders ? (
          <StatusLoadingPlaceholders />
        ) : (
          statuses.map((status, index) => (
            <View key={status.id} style={styles.itemWrap}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onOpen(index)}
                accessibilityLabel={
                  `Ver estado de ${status.authorName}`
                }
              >
                <View
                  style={[
                    styles.circle,
                    status.viewed
                      ? styles.circleViewed
                      : styles.circleUnseen,
                  ]}
                >
                  <View
                    style={[
                      styles.innerCircle,
                      {
                        backgroundColor: status.authorColor,
                      },
                    ]}
                  >
                    <Text style={styles.initials}>
                      {status.authorInitials}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
              <Text style={styles.name} numberOfLines={1}>
                {status.authorName.split(' ')[0]}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    backgroundColor: '#FCFAFF',
  },
  scroll: {
    alignItems: 'center',
    gap: 17,
    paddingHorizontal: 16,
  },
  itemWrap: {
    alignItems: 'center',
    width: 64,
  },
  userCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F4E8FA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#D8BFE9',
    shadowColor: '#9CAED8',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  userText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7B5E9F',
  },
  addBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#C78EBA',
    borderWidth: 2,
    borderColor: '#FCFAFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    padding: 3,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF5FF',
    shadowColor: '#A68ABF',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  circleUnseen: {
    borderColor: '#86A9DC',
  },
  circleViewed: {
    borderColor: '#D5DFEA',
  },
  innerCircle: {
    flex: 1,
    width: '100%',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.55)',
  },
  initials: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.white,
    textShadowColor: 'rgba(47, 39, 70, 0.18)',
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 2,
  },
  name: {
    marginTop: 7,
    fontSize: 11,
    fontWeight: '600',
    color: '#6C7891',
    textAlign: 'center',
  },
  placeholderWrap: {
    paddingTop: 1,
  },
  placeholderCard: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F1FC',
  },
  placeholderLabel: {
    width: 42,
    height: 8,
    marginTop: 7,
    borderRadius: 4,
    backgroundColor: colors.neutral.gray200,
  },
});
