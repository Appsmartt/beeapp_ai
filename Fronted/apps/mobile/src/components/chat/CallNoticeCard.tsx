import { View, Text, StyleSheet } from 'react-native';
import { Phone, PhoneOff, PhoneMissed } from 'lucide-react-native';

interface CallNoticeCardProps {
  event: unknown;
  fallbackText?: string;
  time: string;
}

export default function CallNoticeCard({
  event,
  fallbackText,
  time,
}: CallNoticeCardProps) {
  const connected = event === 'connected';
  const missed = event === 'missed';
  const cancelled = event === 'cancelled';
  const declined = event === 'declined';
  const label = connected
    ? 'Llamada conectada'
    : missed
      ? 'Llamada perdida'
      : cancelled
        ? 'Llamada cancelada'
        : declined
          ? 'Llamada rechazada'
          : fallbackText?.trim() || 'Llamada finalizada';
  const tint = missed || cancelled || declined ? '#C15A66' : '#7561B1';
  const Icon = missed ? PhoneMissed : cancelled || declined ? PhoneOff : Phone;

  return (
    <View style={styles.wrapper} accessibilityLabel={`${label}, ${time}`}>
      <View style={styles.card}>
        <View style={[styles.iconCircle, { backgroundColor: missed || cancelled || declined ? '#FCECEF' : '#F0EBFA' }]}>
          <Icon size={18} color={tint} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.title, { color: tint }]} numberOfLines={2}>
            {label}
          </Text>
          <Text style={styles.subtitle}>
            {connected ? 'La llamada comenzó' : missed ? 'No se respondió la llamada' : cancelled ? 'No se llegó a conectar' : declined ? 'No se aceptó la llamada' : 'Registro de llamada'}
          </Text>
        </View>
        <Text style={styles.time}>{time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginVertical: 9,
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 16,
    backgroundColor: '#F8F6FC',
    borderWidth: 1,
    borderColor: '#E8E2F3',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  content: { flex: 1 },
  title: { fontSize: 13, fontWeight: '700' },
  subtitle: { fontSize: 11, color: '#7B7890', marginTop: 2 },
  time: { fontSize: 10, color: '#88859A', marginLeft: 7 },
});
