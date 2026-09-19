import {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  CalendarDays,
  ChevronRight,
  Folder,
  House,
  Mail,
  NotebookPen,
  Sparkles,
  X,
} from 'lucide-react-native';
import { colors } from '@beeapp/design-system';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PANEL_WIDTH = Math.min(SCREEN_WIDTH * 0.8, 318);

type QuickDestination = {
  accentColor: string;
  accentSoft: string;
  accentStrong: string;
  backgroundColor: string;
  icon: typeof Mail;
  label: string;
  route:
    | '/(main)/mail'
    | '/(main)/calendar'
    | '/(main)/notes'
    | '/(main)/storage';
  subtitle: string;
};

const QUICK_DESTINATIONS: QuickDestination[] = [
  {
    accentColor: '#6F8FD9',
    accentSoft: '#DCE8FF',
    accentStrong: '#8FA9E3',
    backgroundColor: '#F5F8FF',
    icon: Mail,
    label: 'Correos',
    route: '/(main)/mail',
    subtitle: 'Bandeja y cuentas',
  },
  {
    accentColor: '#9B82C8',
    accentSoft: '#EDE6FA',
    accentStrong: '#B29ADD',
    backgroundColor: '#FAF8FF',
    icon: CalendarDays,
    label: 'Agenda',
    route: '/(main)/calendar',
    subtitle: 'Eventos y reuniones',
  },
  {
    accentColor: '#D99B82',
    accentSoft: '#FBE5DC',
    accentStrong: '#E8B3A0',
    backgroundColor: '#FFF9F6',
    icon: NotebookPen,
    label: 'Notas',
    route: '/(main)/notes',
    subtitle: 'Ideas y pendientes',
  },
  {
    accentColor: '#78B7A5',
    accentSoft: '#DDF3EB',
    accentStrong: '#9ACBBD',
    backgroundColor: '#F5FCF9',
    icon: Folder,
    label: 'Archivos',
    route: '/(main)/storage',
    subtitle: 'Documentos y carpetas',
  },
];

export default function ModuleQuickMenu() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [rendered, setRendered] = useState(false);
  const slideAnim = useRef(
    new Animated.Value(PANEL_WIDTH),
  ).current;

  useEffect(() => {
    if (visible) {
      setRendered(true);

      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }).start();

      return;
    }

    if (rendered) {
      Animated.timing(slideAnim, {
        toValue: PANEL_WIDTH,
        duration: 190,
        useNativeDriver: true,
      }).start(() => setRendered(false));
    }
  }, [
    rendered,
    slideAnim,
    visible,
  ]);

  const closeMenu = () => {
    setVisible(false);
  };

  const openDestination = (
    route: QuickDestination['route'],
  ) => {
    closeMenu();
    router.push(route);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.triggerButton}
        activeOpacity={0.8}
        onPress={() => setVisible(true)}
        accessibilityLabel="Abrir accesos rápidos"
        accessibilityHint="Muestra accesos a correos, agenda, notas y archivos"
      >
        <View style={styles.triggerInner}>
          <View style={styles.triggerShine} />

          <House
            size={19}
            color={colors.neutral.white}
            strokeWidth={2.3}
          />
        </View>
      </TouchableOpacity>

      {rendered ? (
        <Modal
          transparent
          visible={visible}
          animationType="none"
          onRequestClose={closeMenu}
        >
          <View style={styles.overlay}>
            <TouchableOpacity
              style={styles.backdrop}
              activeOpacity={1}
              onPress={closeMenu}
              accessibilityLabel="Cerrar accesos rápidos"
            />

            <Animated.View
              style={[
                styles.panel,
                {
                  transform: [
                    {
                      translateX: slideAnim,
                    },
                  ],
                },
              ]}
            >
              <View style={styles.hero}>
                <View style={styles.heroAccentOne} />
                <View style={styles.heroAccentTwo} />
                <View style={styles.heroAccentThree} />

                <View style={styles.heroTopRow}>
                  <View style={styles.heroBrand}>
                    <View style={styles.heroIconWrap}>
                      <View style={styles.heroIconGlow} />

                      <House
                        size={21}
                        color={colors.brand.primary}
                        strokeWidth={2.3}
                      />
                    </View>

                    <View>
                      <Text style={styles.heroTitle}>
                        Accesos rápidos
                      </Text>

                      <Text style={styles.heroSubtitle}>
                        Tu espacio de trabajo
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.closeButton}
                    activeOpacity={0.75}
                    onPress={closeMenu}
                    accessibilityLabel="Cerrar accesos rápidos"
                  >
                    <X
                      size={18}
                      color={colors.neutral.white}
                      strokeWidth={2.3}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.heroMessage}>
                  <Sparkles
                    size={15}
                    color="#FDE68A"
                    strokeWidth={2.2}
                  />

                  <Text style={styles.heroMessageText}>
                    Todo lo que necesitas, a un toque.
                  </Text>
                </View>
              </View>

              <View style={styles.content}>
                <Text style={styles.sectionLabel}>
                  IR A UN MÓDULO
                </Text>

                <View style={styles.actions}>
                  {QUICK_DESTINATIONS.map((destination) => {
                    const Icon = destination.icon;

                    return (
                      <TouchableOpacity
                        key={destination.route}
                        style={[
                          styles.actionButton,
                          {
                            backgroundColor:
                              destination.backgroundColor,
                            borderColor:
                              `${destination.accentColor}24`,
                          },
                        ]}
                        activeOpacity={0.78}
                        onPress={() =>
                          openDestination(destination.route)
                        }
                        accessibilityLabel={`Abrir ${destination.label}`}
                        accessibilityHint="Abre la pantalla completa del módulo"
                      >
                        <View
                          style={[
                            styles.actionIconWrap,
                            {
                              backgroundColor:
                                destination.accentColor,
                              borderColor:
                                destination.accentStrong,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.actionIconShine,
                              {
                                backgroundColor:
                                  destination.accentSoft,
                              },
                            ]}
                          />

                          <Icon
                            size={21}
                            color={colors.neutral.white}
                            strokeWidth={2.1}
                          />
                        </View>

                        <View style={styles.actionText}>
                          <Text style={styles.actionLabel}>
                            {destination.label}
                          </Text>

                          <Text style={styles.actionSubtitle}>
                            {destination.subtitle}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.chevronWrap,
                            {
                              backgroundColor:
                                `${destination.accentColor}16`,
                            },
                          ]}
                        >
                          <ChevronRight
                            size={17}
                            color={destination.accentColor}
                            strokeWidth={2.4}
                          />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </Animated.View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  triggerButton: {
    borderRadius: 14,
    elevation: 4,
    overflow: 'hidden',
    shadowColor: '#B29ADD',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  triggerInner: {
    alignItems: 'center',
    backgroundColor: '#8D73C9',
    height: 38,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 38,
  },
  triggerShine: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 17,
    height: 28,
    position: 'absolute',
    right: -8,
    top: -10,
    width: 28,
  },
  overlay: {
    backgroundColor: 'rgba(47, 39, 70, 0.32)',
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
  },
  panel: {
    backgroundColor: colors.neutral.white,
    borderBottomLeftRadius: 30,
    borderTopLeftRadius: 30,
    elevation: 16,
    overflow: 'hidden',
    shadowColor: '#8B7AAB',
    shadowOffset: {
      width: -7,
      height: 0,
    },
    shadowOpacity: 0.26,
    shadowRadius: 22,
    width: PANEL_WIDTH,
  },
  hero: {
    backgroundColor: colors.brand.primary,
    minHeight: 168,
    overflow: 'hidden',
    paddingBottom: 21,
    paddingHorizontal: 18,
    paddingTop: 24,
  },
  heroAccentOne: {
    backgroundColor: '#A88DD3',
    borderRadius: 88,
    height: 176,
    position: 'absolute',
    right: -56,
    top: -84,
    width: 176,
  },
  heroAccentTwo: {
    backgroundColor: '#B9A6DD',
    borderRadius: 62,
    bottom: -56,
    height: 124,
    position: 'absolute',
    right: 38,
    width: 124,
  },
  heroAccentThree: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 48,
    bottom: -42,
    height: 96,
    left: -26,
    position: 'absolute',
    width: 96,
  },
  heroTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroBrand: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 11,
  },
  heroIconWrap: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    elevation: 3,
    height: 46,
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#A68CCB',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 7,
    width: 46,
  },
  heroIconGlow: {
    backgroundColor: '#F0EAFE',
    borderRadius: 24,
    height: 35,
    position: 'absolute',
    right: -10,
    top: -10,
    width: 35,
  },
  heroTitle: {
    color: colors.neutral.white,
    fontSize: 18,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: 'rgba(255, 255, 255, 0.76)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 3,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 12,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  heroMessage: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    marginTop: 25,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  heroMessageText: {
    color: colors.neutral.white,
    fontSize: 11,
    fontWeight: '600',
  },
  content: {
    paddingBottom: 28,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  sectionLabel: {
    color: colors.neutral.gray500,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 11,
    marginLeft: 2,
  },
  actions: {
    gap: 10,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 72,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  actionIconWrap: {
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1,
    elevation: 3,
    height: 48,
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#1A1A2E',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.16,
    shadowRadius: 5,
    width: 48,
  },
  actionIconShine: {
    borderRadius: 18,
    height: 32,
    opacity: 0.3,
    position: 'absolute',
    right: -10,
    top: -12,
    width: 32,
  },
  actionText: {
    flex: 1,
    marginLeft: 12,
  },
  actionLabel: {
    color: colors.neutral.text,
    fontSize: 14,
    fontWeight: '800',
  },
  actionSubtitle: {
    color: colors.neutral.gray600,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 3,
  },
  chevronWrap: {
    alignItems: 'center',
    borderRadius: 11,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
});
