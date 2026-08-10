
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@beeapp/design-system';
import { Mail, FileText, MessageCircle, ChevronRight } from 'lucide-react-native';

export function HomeActivityCard() {
  return (
    <View style={styles.activityCard}>
      <View style={styles.activityItem}>
        <View style={[styles.activityIconBadge, { backgroundColor: '#EBF5FF' }]}>
          <Mail size={16} color="#1E88E5" />
        </View>
        <View style={styles.activityTextWrap}>
          <Text style={styles.activityTitle}>Correo de Carlos "Reunión de avance"</Text>
          <Text style={styles.activityTime}>Hoy, 10:30 AM</Text>
        </View>
        <ChevronRight size={16} color={colors.neutral.gray500} />
      </View>

      <View style={styles.activityItem}>
        <View style={[styles.activityIconBadge, { backgroundColor: '#FEF3C7' }]}>
          <FileText size={16} color="#D97706" />
        </View>
        <View style={styles.activityTextWrap}>
          <Text style={styles.activityTitle}>Nota creada "Ideas de mercadeo"</Text>
          <Text style={styles.activityTime}>Hoy, 09:15 AM</Text>
        </View>
        <ChevronRight size={16} color={colors.neutral.gray500} />
      </View>

      <View style={[styles.activityItem, { borderBottomWidth: 0 }]}>
        <View style={[styles.activityIconBadge, { backgroundColor: '#E8F5E9' }]}>
          <MessageCircle size={16} color="#2E7D32" />
        </View>
        <View style={styles.activityTextWrap}>
          <Text style={styles.activityTitle}>Mensaje de Whatsapp "Cliente aceptó oferta"</Text>
          <Text style={styles.activityTime}>Ayer, 04:45 PM</Text>
        </View>
        <ChevronRight size={16} color={colors.neutral.gray500} />
      </View>
    </View>
  );
}

export function HomeEventsCard() {
  return (
    <View style={styles.eventsCard}>
      <View style={styles.eventItem}>
        <View style={styles.eventTimeWrap}>
          <Text style={styles.eventTimeHour}>14:00</Text>
          <Text style={styles.eventTimeDuration}>45 min</Text>
        </View>
        <View style={styles.eventBarIndicator} />
        <View style={styles.eventTextWrap}>
          <Text style={styles.eventTitle}>Sincronización semanal de equipo</Text>
          <Text style={styles.eventMeta}>En 2 horas • Sala Virtual BeeApp</Text>
        </View>
      </View>

      <View style={[styles.eventItem, { borderBottomWidth: 0, paddingBottom: 0 }]}>
        <View style={styles.eventTimeWrap}>
          <Text style={styles.eventTimeHour}>10:00</Text>
          <Text style={styles.eventTimeDuration}>1 hora</Text>
        </View>
        <View style={[styles.eventBarIndicator, { backgroundColor: colors.semantic.info }]} />
        <View style={styles.eventTextWrap}>
          <Text style={styles.eventTitle}>Presentación de resultados Q2</Text>
          <Text style={styles.eventMeta}>Mañana • Oficina Principal</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  activityCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    marginBottom: 24,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  activityIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityTextWrap: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.text,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 11,
    color: colors.neutral.gray600,
  },
  eventsCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
    marginBottom: 14,
  },
  eventTimeWrap: {
    width: 50,
    alignItems: 'center',
  },
  eventTimeHour: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  eventTimeDuration: {
    fontSize: 10,
    color: colors.neutral.gray600,
    marginTop: 2,
  },
  eventBarIndicator: {
    width: 4,
    height: '80%',
    borderRadius: 2,
    backgroundColor: colors.brand.primary,
    marginHorizontal: 12,
  },
  eventTextWrap: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.text,
    marginBottom: 2,
  },
  eventMeta: {
    fontSize: 11,
    color: colors.neutral.gray600,
  },
});
