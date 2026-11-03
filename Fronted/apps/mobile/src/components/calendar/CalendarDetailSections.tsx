import type { ReactNode } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';
import {
  Bell,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  Copy,
  HelpCircle,
  MapPin,
  RefreshCw,
  Share2,
  Video,
  XCircle,
} from 'lucide-react-native';
import {
  colors,
} from '@beeapp/design-system';

import type {
  CalendarEvent,
  Invitee,
} from '../../stores/calendarStore';
import {
  formatDateLongLabel,
} from '../../utils/dateHelpers';
import {
  formatTime12Label,
} from '../../utils/timeFormatHelpers';


interface MainDetailsCardProps {
  eventItem: CalendarEvent;
  onCopyLink: () => void;
  onShareLink: () => void;
  onJoinCall: () => void;
}


function getEventTypeLabel(
  eventItem: CalendarEvent,
): string {
  if (eventItem.backendKind === 'hybrid') {
    return 'Evento híbrido';
  }


  return eventItem.type === 'meeting'
    ? 'Reunión virtual'
    : 'Evento presencial';
}


function getRepeatLabel(
  repeat: CalendarEvent['repeat'],
): string {
  if (repeat === 'daily') {
    return 'Diaria';
  }


  if (repeat === 'weekly') {
    return 'Semanal';
  }


  if (repeat === 'monthly') {
    return 'Mensual';
  }


  if (repeat === 'yearly') {
    return 'Anual';
  }


  if (repeat === 'custom') {
    return 'Personalizada';
  }


  return 'No se repite';
}


function getHeroCardTheme(
  eventItem: CalendarEvent,
): {
  primary: string;
  backgroundColor: string;
  borderColor: string;
  shadowColor: string;
  orbPrimary: string;
  orbSecondary: string;
  panelBackground: string;
  panelBorder: string;
  badgeBorder: string;
  badgeLabel: string;
} {
  const badgeLabel = eventItem.type === 'meeting'
    ? 'Virtual'
    : 'Presencial';


  return {
    primary: '#7567D9',
    backgroundColor: '#F3F0FF',
    borderColor: '#DDD6FE',
    shadowColor: '#7567D9',
    orbPrimary: 'rgba(117, 103, 217, 0.12)',
    orbSecondary: 'rgba(168, 155, 255, 0.14)',
    panelBackground: 'rgba(255, 255, 255, 0.82)',
    panelBorder: '#E8E4F8',
    badgeBorder: '#D9D0FA',
    badgeLabel,
  };
}


function formatEventDateLabel(
  date: string,
): string {
  try {
    return formatDateLongLabel(date);
  } catch {
    return date;
  }
}


function formatScheduleLabel(
  eventItem: CalendarEvent,
): string {
  if (eventItem.isAllDay) {
    return 'Todo el día';
  }


  return (
    `${formatTime12Label(eventItem.timeStart)} – `
    + `${formatTime12Label(eventItem.timeEnd)}`
    + (eventItem.duration
      ? ` · ${eventItem.duration}`
      : '')
  );
}


function HeroMetaLine({
  icon,
  text,
  accent,
}: {
  icon: ReactNode;
  text: string;
  accent: string;
}) {
  return (
    <View style={styles.heroMetaLine}>
      <View
        style={[
          styles.heroMetaIconWrap,
          { backgroundColor: accent + '18' },
        ]}
      >
        {icon}
      </View>

      <Text style={styles.heroMetaText}>{text}</Text>
    </View>
  );
}


export function MainDetailsCard({
  eventItem,
  onCopyLink,
  onShareLink,
  onJoinCall,
}: MainDetailsCardProps) {
  const theme = getHeroCardTheme(eventItem);
  const isMeeting = eventItem.type === 'meeting';


  return (
    <View style={styles.heroOuter}>
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: theme.backgroundColor,
            borderColor: theme.borderColor,
            shadowColor: theme.shadowColor,
          },
        ]}
      >
        <View
          pointerEvents="none"
          style={[
            styles.heroOrbPrimary,
            { backgroundColor: theme.orbPrimary },
          ]}
        />

        <View
          pointerEvents="none"
          style={[
            styles.heroOrbSecondary,
            { backgroundColor: theme.orbSecondary },
          ]}
        />

        <View
          style={[
            styles.heroTopBar,
            { backgroundColor: theme.primary },
          ]}
        />

        <View style={styles.heroHeaderRow}>
          <View style={styles.heroHeaderText}>
            <Text style={styles.heroTitle}>
              {eventItem.title}
            </Text>

            <Text style={styles.heroDescription}>
              {getEventTypeLabel(eventItem)}
              {eventItem.isAllDay
                ? ' · Todo el día'
                : ''}
            </Text>
          </View>

          <View
            style={[
              styles.heroBadge,
              { borderColor: theme.badgeBorder },
            ]}
          >
            <Calendar
              size={11}
              color={theme.primary}
              strokeWidth={2.4}
            />

            <Text
              style={[
                styles.heroBadgeText,
                { color: theme.primary },
              ]}
            >
              {theme.badgeLabel}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.heroInfoPanel,
            {
              backgroundColor: theme.panelBackground,
              borderColor: theme.panelBorder,
            },
          ]}
        >
          <HeroMetaLine
            accent={theme.primary}
            text={formatEventDateLabel(eventItem.date)}
            icon={(
              <Calendar
                size={15}
                color={theme.primary}
              />
            )}
          />

          <HeroMetaLine
            accent={theme.primary}
            text={formatScheduleLabel(eventItem)}
            icon={(
              <Clock
                size={15}
                color={theme.primary}
              />
            )}
          />

          {eventItem.location ? (
            <HeroMetaLine
              accent={theme.primary}
              text={eventItem.location}
              icon={(
                <MapPin
                  size={15}
                  color={theme.primary}
                />
              )}
            />
          ) : null}
        </View>
      </View>


      {eventItem.videoUrl && (
        <View
          style={[
            styles.videoLinkCard,
            isMeeting && styles.videoLinkCardMeeting,
          ]}
        >
          <View style={styles.videoHeader}>
            <View style={styles.videoIconWrap}>
              <Video
                size={20}
                color="#7C3AED"
              />
            </View>

            <View style={styles.videoHeaderCopy}>
              <Text style={styles.videoCardTitle}>
                Videollamada
              </Text>

              <Text
                style={styles.videoLinkUrl}
                numberOfLines={2}
              >
                {eventItem.videoUrl}
              </Text>
            </View>
          </View>


          <View style={styles.videoActionsRow}>
            <TouchableOpacity
              style={styles.videoActionBtn}
              onPress={onCopyLink}
              activeOpacity={0.7}
            >
              <Copy
                size={15}
                color={colors.neutral.text}
              />

              <Text style={styles.videoActionText}>
                Ver enlace
              </Text>
            </TouchableOpacity>


            <TouchableOpacity
              style={styles.videoActionBtn}
              onPress={onShareLink}
              activeOpacity={0.7}
            >
              <Share2
                size={15}
                color={colors.neutral.text}
              />

              <Text style={styles.videoActionText}>
                Compartir
              </Text>
            </TouchableOpacity>
          </View>


          <TouchableOpacity
            style={styles.joinMeetingButton}
            onPress={onJoinCall}
            activeOpacity={0.85}
          >
            <Video
              size={18}
              color={colors.neutral.white}
            />

            <Text style={styles.joinMeetingText}>
              Unirse a la videollamada
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}


interface ConfigAndInviteesSectionProps {
  eventItem: CalendarEvent;
  onOpenReminderSheet: () => void;
}


function renderStatusIcon(
  status: Invitee['status'],
) {
  if (status === 'accepted') {
    return (
      <CheckCircle
        size={14}
        color="#10B981"
      />
    );
  }


  if (status === 'declined') {
    return (
      <XCircle
        size={14}
        color="#EF4444"
      />
    );
  }


  return (
    <HelpCircle
      size={14}
      color="#F59E0B"
    />
  );
}


function getStatusLabel(
  status: Invitee['status'],
): string {
  if (status === 'accepted') {
    return 'Aceptado';
  }


  if (status === 'declined') {
    return 'Rechazado';
  }


  return 'Pendiente';
}


function getStatusPillStyle(
  status: Invitee['status'],
) {
  if (status === 'accepted') {
    return styles.statusPillAccepted;
  }


  if (status === 'declined') {
    return styles.statusPillDeclined;
  }


  return styles.statusPillPending;
}


export function ConfigAndInviteesSection({
  eventItem,
  onOpenReminderSheet,
}: ConfigAndInviteesSectionProps) {
  const hasDescription = Boolean(
    eventItem.description?.trim(),
  );


  return (
    <>
      <Text style={styles.sectionHeader}>
        Descripción
      </Text>


      <View style={styles.descriptionCard}>
        <Text
          style={[
            styles.descriptionText,
            !hasDescription && styles.descriptionPlaceholder,
          ]}
        >
          {hasDescription
            ? eventItem.description
            : 'Sin descripción adicional para este evento.'}
        </Text>
      </View>


      <Text style={styles.sectionHeader}>
        Configuración
      </Text>


      <View style={styles.configCard}>
        <TouchableOpacity
          style={styles.configItemTouch}
          onPress={onOpenReminderSheet}
          activeOpacity={0.7}
        >
          <View style={styles.configIconWrap}>
            <Bell
              size={16}
              color={colors.brand.primary}
            />
          </View>

          <View style={styles.configCopy}>
            <Text style={styles.configLabel}>
              Recordatorio
            </Text>

            <Text style={styles.configValue}>
              {eventItem.reminder}
            </Text>
          </View>

          <ChevronRight
            size={18}
            color={colors.neutral.gray400}
          />
        </TouchableOpacity>


        <View style={styles.configDivider} />

        <View style={styles.configItemTouch}>
          <View
            style={[
              styles.configIconWrap,
              styles.configIconWrapMuted,
            ]}
          >
            <RefreshCw
              size={16}
              color={colors.neutral.gray600}
            />
          </View>

          <View style={styles.configCopy}>
            <Text style={styles.configLabel}>
              Repetición
            </Text>

            <Text style={styles.configValue}>
              {getRepeatLabel(eventItem.repeat)}
            </Text>
          </View>
        </View>
      </View>


      <Text style={styles.sectionHeader}>
        Invitados ({eventItem.invitees.length})
      </Text>


      <View style={styles.inviteesCard}>
        {eventItem.invitees.length === 0 ? (
          <Text style={styles.emptyInviteesText}>
            No hay invitados para este evento.
          </Text>
        ) : (
          eventItem.invitees.map((invitee, index) => (
            <View
              key={invitee.id}
              style={[
                styles.inviteeRow,
                index < eventItem.invitees.length - 1
                  && styles.inviteeRowBorder,
              ]}
            >
              <View
                style={[
                  styles.inviteeAvatar,
                  {
                    backgroundColor: invitee.color,
                  },
                ]}
              >
                <Text style={styles.inviteeAvatarText}>
                  {invitee.initials}
                </Text>
              </View>


              <Text
                style={styles.inviteeName}
                numberOfLines={1}
              >
                {invitee.name}
              </Text>


              <View
                style={[
                  styles.inviteeStatusBox,
                  getStatusPillStyle(invitee.status),
                ]}
              >
                {renderStatusIcon(invitee.status)}

                <Text style={styles.inviteeStatusLabel}>
                  {getStatusLabel(invitee.status)}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </>
  );
}


const styles = StyleSheet.create({
  heroOuter: {
    marginTop: 4,
    gap: 14,
  },
  heroCard: {
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 3,
  },
  heroOrbPrimary: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    right: -36,
    top: -28,
  },
  heroOrbSecondary: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    left: -24,
    bottom: -32,
  },
  heroTopBar: {
    width: 42,
    height: 4,
    borderRadius: 999,
    opacity: 0.35,
    marginBottom: 14,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heroHeaderText: {
    flex: 1,
    paddingRight: 10,
  },
  heroTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    color: '#2A3142',
  },
  heroDescription: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    color: '#64708A',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D9D0FA',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  heroInfoPanel: {
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  heroMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroMetaIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMetaText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: '#2A3142',
    textTransform: 'capitalize',
  },
  videoLinkCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 16,
    gap: 14,
    shadowColor: '#1E1B4B',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  videoLinkCardMeeting: {
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D5FF',
  },
  videoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  videoIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.neutral.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  videoHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  videoCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  videoLinkUrl: {
    fontSize: 12,
    color: colors.neutral.gray600,
    lineHeight: 17,
  },
  videoActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  videoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  videoActionText: {
    fontSize: 12,
    color: colors.neutral.text,
    fontWeight: '600',
  },
  joinMeetingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brand.primary,
    paddingVertical: 14,
    borderRadius: 14,
  },
  joinMeetingText: {
    color: colors.neutral.white,
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 22,
    marginBottom: 8,
  },
  descriptionCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 16,
  },
  descriptionText: {
    fontSize: 14,
    color: colors.neutral.text,
    fontWeight: '400',
    lineHeight: 21,
  },
  descriptionPlaceholder: {
    color: colors.neutral.gray500,
    fontStyle: 'italic',
  },
  configCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    overflow: 'hidden',
  },
  configItemTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  configDivider: {
    height: 1,
    backgroundColor: colors.neutral.gray100,
    marginHorizontal: 14,
  },
  configIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.brand.primary + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  configIconWrapMuted: {
    backgroundColor: colors.neutral.gray100,
  },
  configCopy: {
    flex: 1,
    gap: 2,
  },
  configLabel: {
    fontSize: 11,
    color: colors.neutral.gray500,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  configValue: {
    fontSize: 14,
    color: colors.neutral.text,
    fontWeight: '600',
  },
  inviteesCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  inviteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  inviteeRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  inviteeAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteeAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  inviteeName: {
    flex: 1,
    fontSize: 14,
    color: colors.neutral.text,
    fontWeight: '500',
  },
  inviteeStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPillAccepted: {
    backgroundColor: '#ECFDF5',
  },
  statusPillDeclined: {
    backgroundColor: '#FEF2F2',
  },
  statusPillPending: {
    backgroundColor: '#FFFBEB',
  },
  inviteeStatusLabel: {
    fontSize: 11,
    color: colors.neutral.gray700,
    fontWeight: '600',
  },
  emptyInviteesText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.neutral.gray600,
    paddingVertical: 12,
    textAlign: 'center',
  },
});
