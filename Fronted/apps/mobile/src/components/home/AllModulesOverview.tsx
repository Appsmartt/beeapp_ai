import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Bell,
  Bot,
  Calendar,
  ChevronRight,
  FileText,
  FolderOpen,
  Mail,
  MessageCircle,
  Pencil,
  Search,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Video,
} from 'lucide-react-native';
import {
  colors,
} from '@beeapp/design-system';
import {
  getNotifications,
  getStorageSummary,
} from '@beeapp/api-client';
import type {
  StorageSummary,
} from '@beeapp/shared-types';

import {
  useModuleNav,
  useScreenParams,
} from '../embedded/EmbeddedNavContext';
import {
  formatBytes,
  getStorageSummary as getStoredStorageSummary,
  setStorageSummary,
} from '../../stores/storageStore';
import {
  getValidSessionCredentials,
} from '../../services/authSession';
import {
  getFixedViewNotes,
} from '../../services/notesService';
import {
  useNotes,
} from '../../hooks/useNotes';
import {
  getCalendarEvents,
  TODAY_STR,
  type CalendarEvent,
} from '../../stores/calendarStore';
import {
  styles,
} from './allModulesOverviewStyles';


const STORAGE_NOTIFICATION_MODULE = 'storage';


const MOCK_AVATARS = [
  {
    initials: 'CM',
    bg: '#DBEAFE',
    text: '#1E40AF',
  },
  {
    initials: 'MA',
    bg: '#FEF3C7',
    text: '#92400E',
  },
  {
    initials: 'JP',
    bg: '#ECFDF5',
    text: '#065F46',
  },
];


function getUsagePercentage(
  usedBytes: number,
  quotaBytes: number,
  apiPercentage: number,
): number {
  if (
    Number.isFinite(apiPercentage)
    && apiPercentage >= 0
  ) {
    return Math.min(
      100,
      Math.max(0, apiPercentage),
    );
  }

  if (
    !Number.isFinite(usedBytes)
    || !Number.isFinite(quotaBytes)
    || quotaBytes <= 0
  ) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      (usedBytes / quotaBytes) * 100,
    ),
  );
}


function getTomorrowDateString(): string {
  const [
    year,
    month,
    day,
  ] = TODAY_STR
    .split('-')
    .map(Number);

  const today = new Date(
    year,
    month - 1,
    day,
  );

  today.setDate(today.getDate() + 1);

  const nextYear = today.getFullYear();
  const nextMonth = String(
    today.getMonth() + 1,
  ).padStart(2, '0');
  const nextDay = String(
    today.getDate(),
  ).padStart(2, '0');

  return `${nextYear}-${nextMonth}-${nextDay}`;
}


function getAgendaDayLabel(
  eventDate: string,
): string {
  if (eventDate === TODAY_STR) {
    return 'Hoy';
  }

  if (eventDate === getTomorrowDateString()) {
    return 'Mañana';
  }

  const [
    year,
    month,
    day,
  ] = eventDate
    .split('-')
    .map(Number);

  const date = new Date(
    year,
    month - 1,
    day,
  );

  return date.toLocaleDateString(
    'es-CO',
    {
      day: 'numeric',
      month: 'short',
    },
  );
}


function getAgendaMeta(
  event: CalendarEvent,
): string {
  if (event.isAllDay) {
    return 'Todo el día';
  }

  const location = event.isVirtual
    ? 'Virtual'
    : event.location || 'Presencial';

  return `${event.timeStart} · ${location}`;
}


function getUpcomingCalendarEvents(): CalendarEvent[] {
  return getCalendarEvents()
    .filter((event) => event.date >= TODAY_STR)
    .sort((first, second) => {
      if (first.date !== second.date) {
        return first.date.localeCompare(
          second.date,
        );
      }

      if (first.isAllDay && !second.isAllDay) {
        return -1;
      }

      if (!first.isAllDay && second.isAllDay) {
        return 1;
      }

      return first.timeStart.localeCompare(
        second.timeStart,
      );
    });
}


export default function AllModulesOverview() {
  const router = useModuleNav();
  const params = useScreenParams();

  const onOpenModule = params.onOpenModule as
    | ((id: string) => void)
    | undefined;

  const {
    notes,
  } = useNotes();

  const [storageSummary, setLocalStorageSummary] =
    useState<StorageSummary | null>(
      getStoredStorageSummary(),
    );

  const [
    unreadStorageNotifications,
    setUnreadStorageNotifications,
  ] = useState(0);

  const upcomingCalendarEvents = useMemo(
    () => getUpcomingCalendarEvents(),
    [],
  );

  const todayCalendarEvents = useMemo(
    () =>
      upcomingCalendarEvents.filter(
        (event) => event.date === TODAY_STR,
      ),
    [upcomingCalendarEvents],
  );

  const nextCalendarEvent = upcomingCalendarEvents[0] || null;

  const totalNotes = useMemo(
    () => getFixedViewNotes('all', notes).length,
    [notes],
  );

  const notesCountLabel = totalNotes === 1
    ? '1 nota'
    : `${totalNotes} notas`;

  const loadStorageCardData = useCallback(
    async () => {
      try {
        const auth =
          await getValidSessionCredentials();

        if (!auth) {
          return;
        }

        const [
          summaryResponse,
          notificationsResponse,
        ] = await Promise.all([
          getStorageSummary(auth),
          getNotifications(auth, {
            module: STORAGE_NOTIFICATION_MODULE,
            unread_only: true,
            limit: 1,
            offset: 0,
          }),
        ]);

        setStorageSummary(summaryResponse.storage);
        setLocalStorageSummary(
          summaryResponse.storage,
        );

        setUnreadStorageNotifications(
          notificationsResponse.unread_count,
        );
      } catch {
        // Si falla la consulta se conserva el último resumen en memoria.
      }
    },
    [],
  );

  useEffect(() => {
    void loadStorageCardData();
  }, [loadStorageCardData]);

  const handleOpenModule = (
    id: string,
  ) => {
    if (onOpenModule) {
      onOpenModule(id);
      return;
    }

    if (id === 'beeservices') {
      router.push('/(main)/beeservices');
      return;
    }

    if (id === 'files') {
      router.push('/(main)/storage');
      return;
    }

    router.push(`/(main)/${id}`);
  };

  const usedBytes = storageSummary?.used_bytes ?? 0;
  const quotaBytes = storageSummary?.quota_bytes ?? 0;

  const storageUsagePercentage = getUsagePercentage(
    usedBytes,
    quotaBytes,
    storageSummary?.usage_percentage ?? 0,
  );

  const storageUsageLabel = storageSummary
    ? `${formatBytes(usedBytes)} usados de ${formatBytes(
      quotaBytes,
    )}`
    : 'Cargando almacenamiento...';

  const storageNotificationLabel =
    unreadStorageNotifications === 1
      ? '1 notificación sin leer'
      : `${unreadStorageNotifications} notificaciones sin leer`;

  const todayEventsLabel = todayCalendarEvents.length === 1
    ? '1 hoy'
    : `${todayCalendarEvents.length} hoy`;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity
        style={styles.beeServicesCard}
        activeOpacity={0.85}
        onPress={() => handleOpenModule('beeservices')}
      >
        <View style={styles.beeServicesTopRow}>
          <View style={styles.beeServicesIconWrap}>
            <ShoppingBag
              size={32}
              color={colors.brand.primary}
            />
          </View>

          <View style={styles.beeServicesTextCol}>
            <Text style={styles.beeServicesTitle}>
              BeeServices
            </Text>

            <Text style={styles.beeServicesSubtitle}>
              Tus negocios y catálogo comercial
            </Text>
          </View>

          <ChevronRight
            size={24}
            color={colors.brand.primary}
          />
        </View>

        <Text style={styles.beeServicesDescText}>
          Crea tu negocio, publica productos y servicios. Los clientes te
          encontrarán a través del asistente de IA.
        </Text>

        <View style={styles.beeServicesMetricsRow}>
          <View style={styles.beeMetricBadge}>
            <Text style={styles.beeMetricText}>
              2 Negocios
            </Text>
          </View>

          <View style={styles.beeMetricBadge}>
            <Text style={styles.beeMetricText}>
              4 Productos
            </Text>
          </View>

          <View style={styles.beeMetricBadge}>
            <Text style={styles.beeMetricText}>
              3 Servicios
            </Text>
          </View>

          <View style={styles.beeMetricBadge}>
            <Text style={styles.beeMetricText}>
              12 Consultas recibidas
            </Text>
          </View>
        </View>

        <View style={styles.beeServicesHighlightsRow}>
          <View style={styles.beeHighlightItem}>
            <Search
              size={14}
              color={colors.brand.primary}
            />

            <Text style={styles.beeHighlightText}>
              Los clientes te encuentran vía IA
            </Text>
          </View>

          <View style={styles.beeHighlightItem}>
            <MessageCircle
              size={14}
              color={colors.brand.primary}
            />

            <Text style={styles.beeHighlightText}>
              Chat directo con compradores
            </Text>
          </View>

          <View style={styles.beeHighlightItem}>
            <TrendingUp
              size={14}
              color={colors.brand.primary}
            />

            <Text style={styles.beeHighlightText}>
              Visibilidad en la red empresarial
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.gridContainer}>
        <TouchableOpacity
          style={styles.gridCard}
          activeOpacity={0.85}
          onPress={() => handleOpenModule('chat')}
        >
          <View>
            <View style={styles.aiHeaderRow}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Sparkles
                  size={18}
                  color="#7C3AED"
                />

                <Text style={styles.aiTitle}>
                  Asistente IA
                </Text>
              </View>
            </View>

            <View style={styles.aiStatusRow}>
              <View style={styles.aiStatusBadge}>
                <Text style={styles.aiStatusText}>
                  En línea
                </Text>
              </View>
            </View>

            <Text style={styles.aiSubtitle}>
              Siempre aquí para ayudarte
            </Text>

            <Text
              style={styles.aiDescription}
              numberOfLines={2}
            >
              Pídeme que resuma tus correos, prepare reuniones o busque
              oportunidades para tu negocio.
            </Text>

            <View style={styles.badgesContainer}>
              <View style={styles.badgePill}>
                <Text style={styles.badgeText}>
                  Último: resumen de correos
                </Text>
              </View>

              <View style={styles.badgePillGray}>
                <Text style={styles.badgeTextGray}>
                  3 tareas sugeridas
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.aiFooterRow}>
            <Text
              style={styles.aiFooterText}
              numberOfLines={1}
            >
              ¿En qué te ayudo hoy?
            </Text>

            <View style={styles.aiBotCircle}>
              <Bot
                size={16}
                color="#7C3AED"
              />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gridCard}
          activeOpacity={0.8}
          onPress={() => handleOpenModule('chat')}
        >
          <View>
            <View style={styles.cardHeaderRow}>
              <MessageCircle
                size={26}
                color="#7C3AED"
              />
            </View>

            <Text style={styles.cardTitle}>
              Chat
            </Text>

            <Text style={styles.cardSubtitle}>
              Mensajería
            </Text>

            <View style={styles.badgesContainer}>
              <View style={styles.badgePill}>
                <Text style={styles.badgeText}>
                  3 Nuevos
                </Text>
              </View>

              <View style={styles.badgePillRed}>
                <Text style={styles.badgeTextRed}>
                  1 Llamada perdida
                </Text>
              </View>

              <View style={styles.badgePillGray}>
                <Text style={styles.badgeTextGray}>
                  2 Grupos activos
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.cardFooterBox}>
            <View style={styles.avatarsFooterRow}>
              <View style={styles.avatarsOverlap}>
                {MOCK_AVATARS.map((avatar, index) => (
                  <View
                    key={avatar.initials}
                    style={[
                      styles.avatarCircle,
                      {
                        backgroundColor: avatar.bg,
                      },
                      index > 0 && {
                        marginLeft: -6,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.avatarText,
                        {
                          color: avatar.text,
                        },
                      ]}
                    >
                      {avatar.initials}
                    </Text>
                  </View>
                ))}
              </View>

              <Text
                style={styles.avatarsLabel}
                numberOfLines={1}
              >
                Carlos, María y 1 más
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gridCard}
          activeOpacity={0.8}
          onPress={() => handleOpenModule('mail')}
        >
          <View>
            <View style={styles.cardHeaderRow}>
              <Mail
                size={26}
                color="#4F46E5"
              />
            </View>

            <Text style={styles.cardTitle}>
              Correos
            </Text>

            <Text style={styles.cardSubtitle}>
              Bandeja inteligente
            </Text>

            <View style={styles.badgesContainer}>
              <View style={styles.badgePill}>
                <Text style={styles.badgeText}>
                  5 Sin leer
                </Text>
              </View>

              <View style={styles.badgePillGray}>
                <Text style={styles.badgeTextGray}>
                  2 Con adjuntos
                </Text>
              </View>

              <View style={styles.badgePillOrange}>
                <Text style={styles.badgeTextOrange}>
                  1 Importante
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.cardFooterBox}>
            <Text
              style={styles.cardPreviewText}
              numberOfLines={1}
            >
              Carlos M. - Avance del proyecto Q3...
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gridCard}
          activeOpacity={0.8}
          onPress={() => handleOpenModule('calendar')}
        >
          <View>
            <View style={styles.cardHeaderRow}>
              <Calendar
                size={26}
                color="#4F46E5"
              />
            </View>

            <Text style={styles.cardTitle}>
              Agenda
            </Text>

            <Text style={styles.cardSubtitle}>
              Calendario
            </Text>

            {upcomingCalendarEvents.length > 0 ? (
              <View style={styles.badgesContainer}>
                <View style={styles.badgePill}>
                  <Text style={styles.badgeText}>
                    {todayEventsLabel}
                  </Text>
                </View>

                <View style={styles.badgePillOrange}>
                  <Text style={styles.badgeTextOrange}>
                    Próximo: {getAgendaDayLabel(
                      nextCalendarEvent?.date || TODAY_STR,
                    )}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.badgesContainer}>
                <View style={styles.badgePillGray}>
                  <Text style={styles.badgeTextGray}>
                    Sin eventos próximos
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.cardFooterBox}>
            {nextCalendarEvent ? (
              <View style={styles.eventFooterRow}>
                {nextCalendarEvent.isVirtual ? (
                  <Video
                    size={13}
                    color="#6025D2B3"
                  />
                ) : (
                  <Calendar
                    size={13}
                    color="#6025D2B3"
                  />
                )}

                <Text
                  style={styles.cardPreviewText}
                  numberOfLines={1}
                >
                  {`${getAgendaDayLabel(
                    nextCalendarEvent.date,
                  )} · ${getAgendaMeta(nextCalendarEvent)} · ${
                    nextCalendarEvent.title
                  }`}
                </Text>
              </View>
            ) : (
              <Text
                style={styles.cardPreviewText}
                numberOfLines={1}
              >
                Toca para abrir tu Agenda
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gridCard}
          activeOpacity={0.8}
          onPress={() => handleOpenModule('notes')}
        >
          <View>
            <View style={styles.cardHeaderRow}>
              <FileText
                size={26}
                color="#7C3AED"
              />
            </View>

            <Text style={styles.cardTitle}>
              Notas
            </Text>

            <Text style={styles.cardSubtitle}>
              Apuntes rápidos
            </Text>

            <View style={styles.badgesContainer}>
              <View style={styles.notesCountBadge}>
                <Pencil
                  size={11}
                  color={colors.neutral.gray700}
                />

                <Text style={styles.badgeText}>
                  {notesCountLabel}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.cardFooterBox}>
            <Text
              style={styles.cardPreviewText}
              numberOfLines={1}
            >
              {totalNotes === 0
                ? 'Aún no tienes notas'
                : 'Toca para ver todas tus notas'}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gridCard}
          activeOpacity={0.8}
          onPress={() => handleOpenModule('files')}
        >
          <View>
            <View style={styles.cardHeaderRow}>
              <FolderOpen
                size={26}
                color="#4F46E5"
              />
            </View>

            <Text style={styles.cardTitle}>
              Archivos
            </Text>

            <Text style={styles.cardSubtitle}>
              Almacenamiento
            </Text>

            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${storageUsagePercentage}%`,
                  },
                ]}
              />
            </View>

            <Text
              style={styles.cardPreviewText}
              numberOfLines={1}
            >
              {storageUsageLabel}
            </Text>

            <View style={styles.storageNotificationRow}>
              <Bell
                size={12}
                color={colors.brand.primary}
              />

              <Text
                style={styles.storageNotificationText}
                numberOfLines={1}
              >
                {storageNotificationLabel}
              </Text>
            </View>
          </View>

          <View style={styles.cardFooterBox}>
            <Text
              style={styles.cardPreviewText}
              numberOfLines={1}
            >
              Toca para ver tus archivos
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}