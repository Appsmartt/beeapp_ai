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
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  scroll: {
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
  },
  itemWrap: {
    alignItems: 'center',
    width: 60,
  },
  userCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.neutral.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
  },
  userText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray700,
  },
  addBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.brand.primary,
    borderWidth: 2,
    borderColor: colors.neutral.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    padding: 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleUnseen: {
    borderColor: colors.brand.primary,
  },
  circleViewed: {
    borderColor: colors.neutral.gray300,
  },
  innerCircle: {
    flex: 1,
    width: '100%',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.brand.primary,
  },
  name: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '400',
    color: colors.neutral.gray600,
    textAlign: 'center',
  },
  placeholderWrap: {
    paddingTop: 1,
  },
  placeholderCard: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.neutral.gray200,
  },
  placeholderLabel: {
    width: 42,
    height: 8,
    marginTop: 7,
    borderRadius: 4,
    backgroundColor: colors.neutral.gray200,
  },
});
