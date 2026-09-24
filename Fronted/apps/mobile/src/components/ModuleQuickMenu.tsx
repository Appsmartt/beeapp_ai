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
  X,
} from 'lucide-react-native';
import { colors } from '@beeapp/design-system';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PANEL_WIDTH = Math.min(SCREEN_WIDTH * 0.8, 318);

type QuickDestination = {
  accentColor: string;
  accentSoft: string;
  accentStrong: string;
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
    accentColor: '#668FCE',
    accentSoft: '#EAF2FF',
    accentStrong: '#D1E0F7',
    icon: Mail,
    label: 'Correos',
    route: '/(main)/mail',
    subtitle: 'Bandeja y cuentas',
  },
  {
    accentColor: '#8C70C8',
    accentSoft: '#F0EBFF',
    accentStrong: '#DED4F7',
    icon: CalendarDays,
    label: 'Agenda',
    route: '/(main)/calendar',
    subtitle: 'Eventos y reuniones',
  },
  {
    accentColor: '#D88772',
    accentSoft: '#FFF0EB',
    accentStrong: '#F5D9D0',
    icon: NotebookPen,
    label: 'Notas',
    route: '/(main)/notes',
    subtitle: 'Ideas y pendientes',
  },
  {
    accentColor: '#62A98E',
    accentSoft: '#E7F6EF',
    accentStrong: '#CFE9DD',
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
              <View style={styles.header}>
                <View style={styles.headerBrand}>
                  <View style={styles.headerIconWrap}>
                    <House
                      size={20}
                      color={colors.brand.primary}
                      strokeWidth={2.3}
                    />
                  </View>

                  <View>
                    <Text style={styles.headerTitle}>
                      Accesos rápidos
                    </Text>

                    <Text style={styles.headerSubtitle}>
                      Tus módulos principales
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
                    color={colors.neutral.gray600}
                    strokeWidth={2.3}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.content}>
                <Text style={styles.sectionLabel}>
                  MÓDULOS
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
                            borderColor:
                              destination.accentStrong,
                          },
                        ]}
                        activeOpacity={0.76}
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
                                destination.accentSoft,
                              borderColor:
                                destination.accentStrong,
                            },
                          ]}
                        >
                          <Icon
                            size={21}
                            color={destination.accentColor}
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

                        <ChevronRight
                          size={19}
                          color={destination.accentColor}
                          strokeWidth={2.25}
                        />
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
    shadowColor: colors.brand.primary,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  triggerInner: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderColor: '#968BE4',
    borderRadius: 14,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  overlay: {
    backgroundColor: 'rgba(34, 43, 67, 0.32)',
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
  },
  panel: {
    backgroundColor: colors.neutral.gray50,
    borderBottomLeftRadius: 30,
    borderColor: colors.neutral.gray200,
    borderLeftWidth: 1,
    borderTopLeftRadius: 30,
    elevation: 16,
    overflow: 'hidden',
    shadowColor: '#8996B5',
    shadowOffset: {
      width: -7,
      height: 0,
    },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    width: PANEL_WIDTH,
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderBottomColor: colors.neutral.gray200,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 16,
    paddingHorizontal: 18,
    paddingTop: 24,
  },
  headerBrand: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
  },
  headerIconWrap: {
    alignItems: 'center',
    backgroundColor: '#F0EDFF',
    borderColor: '#DDD6FE',
    borderRadius: 15,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    marginRight: 11,
    width: 44,
  },
  headerTitle: {
    color: '#303B5A',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#6C7892',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 3,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.neutral.gray50,
    borderColor: colors.neutral.gray200,
    borderRadius: 12,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  content: {
    flex: 1,
    paddingBottom: 28,
    paddingHorizontal: 14,
    paddingTop: 18,
  },
  sectionLabel: {
    color: colors.neutral.gray500,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 11,
    marginLeft: 2,
  },
  actions: {
    gap: 9,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 76,
    paddingHorizontal: 13,
    paddingVertical: 11,
    shadowColor: '#AAB7D4',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.07,
    shadowRadius: 7,
    elevation: 1,
  },
  actionIconWrap: {
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  actionText: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },
  actionLabel: {
    color: '#303B5A',
    fontSize: 15,
    fontWeight: '700',
  },
  actionSubtitle: {
    color: '#6C7892',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 3,
  },
});
