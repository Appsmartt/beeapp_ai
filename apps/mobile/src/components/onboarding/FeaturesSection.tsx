
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@beeapp/design-system';
import {
  Mail,
  MessageCircle,
  FileText,
  Folder,
  Calendar,
  Sparkles,
  Bell,
  MapPin,
  Camera,
  Mic,
  HardDrive,
} from 'lucide-react-native';

const BENEFITS = [
  { icon: Mail, title: 'Correo unificado', desc: 'Conecta Gmail y Outlook en un solo buzón inteligente.' },
  { icon: MessageCircle, title: 'Chats y llamadas', desc: 'Conversa, llama y haz videollamadas con tus equipos de trabajo.' },
  { icon: FileText, title: 'Notas', desc: 'Guarda, edita y organiza tus ideas y recordatorios diarios.' },
  { icon: Folder, title: 'Archivos', desc: 'Almacena, organiza y firma digitalmente todos tus documentos.' },
  { icon: Calendar, title: 'Agenda', desc: 'Programa y administra reuniones corporativas en segundos.' },
  { icon: Sparkles, title: 'Asistente de IA', desc: 'Agiliza envíos de mails, notas y búsquedas con comandos de voz.' },
];

const PERMISSIONS = [
  { icon: Bell, title: 'Notificaciones', desc: 'Te avisa sobre nuevos mensajes, llamadas entrantes o recordatorios de reuniones.' },
  { icon: MapPin, title: 'Ubicación', desc: 'Sirve para autocompletar tu dirección laboral o compartir ubicación real en chats.' },
  { icon: Camera, title: 'Cámara', desc: 'Para tomar fotos de perfil, realizar videollamadas y escanear tus documentos físicos.' },
  { icon: Mic, title: 'Micrófono', desc: 'Habilita las llamadas de voz, grabación de audios de chat y dictado por voz al asistente.' },
  { icon: HardDrive, title: 'Almacenamiento', desc: 'Para descargar archivos compartidos y adjuntar documentos desde tu dispositivo móvil.' },
];

export default function FeaturesSection() {
  return (
    <>
      {/* List of Benefits */}
      <Text style={styles.groupHeader}>Beneficios Clave</Text>
      <View style={styles.listCard}>
        {BENEFITS.map((benefit) => (
          <View key={benefit.title} style={styles.listItem}>
            <benefit.icon size={22} color={colors.brand.primary} style={styles.listIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.listItemTitle}>{benefit.title}</Text>
              <Text style={styles.listItemDesc}>{benefit.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Explanation of System Permissions (No systems prompts triggered here) */}
      <Text style={styles.groupHeader}>Accesos Informativos (Opcionales)</Text>
      <Text style={styles.permissionsNotice}>
        Para habilitar todas las funciones, te explicamos qué accesos utilizaremos en la app y por qué:
      </Text>

      <View style={styles.listCard}>
        {PERMISSIONS.map((permission) => (
          <View key={permission.title} style={styles.permissionItem}>
            <permission.icon size={18} color={colors.brand.primary} style={styles.listIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.permissionTitle}>{permission.title}</Text>
              <Text style={styles.permissionDesc}>{permission.desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  groupHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 8,
  },
  listCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    marginBottom: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  listIcon: {
    marginRight: 14,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.text,
    marginBottom: 2,
  },
  listItemDesc: {
    fontSize: 12,
    color: colors.neutral.gray600,
  },
  permissionsNotice: {
    fontSize: 13,
    color: colors.neutral.gray600,
    lineHeight: 18,
    marginBottom: 12,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  permissionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.text,
    marginBottom: 2,
  },
  permissionDesc: {
    fontSize: 11,
    color: colors.neutral.gray600,
    lineHeight: 15,
  },
});
