import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import ScreenSafeArea from '../../src/components/layout/ScreenSafeArea';
import { useRouter } from 'expo-router';
import { colors } from '@beeapp/design-system';
import FloatingTabBar from '../../src/components/FloatingTabBar';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacidad</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.mainTitle}>Política de Privacidad</Text>
        <Text style={styles.lastUpdated}>Última actualización: 22 de Julio, 2026</Text>

        <Text style={styles.sectionTitle}>1. Información que Recopilamos</Text>
        <Text style={styles.paragraph}>
          Para prestar nuestros servicios, recopilamos la siguiente información técnica y personal:
        </Text>
        <Text style={styles.bulletPoint}>• Número de teléfono celular utilizado para el registro.</Text>
        <Text style={styles.bulletPoint}>• Datos de perfil opcionales (nombre, foto de perfil, cargo).</Text>
        <Text style={styles.bulletPoint}>• Contenido de mensajes, imágenes, archivos y metadatos de chat que usted comparta voluntariamente.</Text>
        <Text style={styles.bulletPoint}>• Datos de diagnóstico e información de uso del dispositivo (modelo, versión del SO, dirección IP).</Text>

        <Text style={styles.sectionTitle}>2. Uso de la Información</Text>
        <Text style={styles.paragraph}>
          La información recopilada se utiliza exclusivamente para:
        </Text>
        <Text style={styles.bulletPoint}>• Proveer, operar y dar mantenimiento a los chats de comunicación corporativa.</Text>
        <Text style={styles.bulletPoint}>• Enviar notificaciones de seguridad y códigos OTP de acceso.</Text>
        <Text style={styles.bulletPoint}>• Optimizar y entrenar nuestros modelos internos de Inteligencia Artificial para mejorar tu productividad laboral (sin comprometer la privacidad individual).</Text>

        <Text style={styles.sectionTitle}>3. Almacenamiento y Seguridad</Text>
        <Text style={styles.paragraph}>
          Toda la información se transmite de forma segura mediante protocolos HTTPS/TLS y se almacena utilizando cifrado en reposo (AES-256). Implementamos medidas técnicas robustas para prevenir el acceso no autorizado, la alteración o la destrucción de sus datos empresariales.
        </Text>

        <Text style={styles.sectionTitle}>4. Compartición de Datos y Terceros</Text>
        <Text style={styles.paragraph}>
          No vendemos, alquilamos ni comercializamos sus datos personales con terceras partes bajo ningún concepto. Los datos solo se compartirán con proveedores esenciales de infraestructura en la nube bajo estrictas cláusulas de confidencialidad o cuando sea requerido por mandatos judiciales de las autoridades colombianas.
        </Text>

        <Text style={styles.sectionTitle}>5. Derechos del Usuario (ARCO)</Text>
        <Text style={styles.paragraph}>
          Como titular de los datos en Colombia (bajo la Ley 1581 de 2012), usted tiene derecho a conocer, actualizar, rectificar y solicitar la eliminación de su información personal de nuestras bases de datos en cualquier momento escribiendo a privacidad@beeapp.ai.
        </Text>

        <Text style={styles.sectionTitle}>6. Cambios a esta Política</Text>
        <Text style={styles.paragraph}>
          Podemos actualizar nuestra Política de Privacidad de forma periódica. Le notificaremos cualquier cambio sustancial mediante alertas internas en la aplicación móvil o por correo electrónico.
        </Text>

        {/* Clearance for the floating menu */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Assistant always within reach */}
      <FloatingTabBar />
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.gray50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.neutral.gray100,
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.neutral.text,
    marginBottom: 6,
  },
  lastUpdated: {
    fontSize: 12,
    color: colors.neutral.gray600,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.text,
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: colors.neutral.gray700,
    lineHeight: 22,
    marginBottom: 10,
    textAlign: 'justify',
  },
  bulletPoint: {
    fontSize: 14,
    color: colors.neutral.gray700,
    lineHeight: 22,
    marginLeft: 12,
    marginBottom: 8,
    textAlign: 'justify',
  },
});
