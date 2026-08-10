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

export default function TermsScreen() {
  const router = useRouter();

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Términos</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.mainTitle}>Términos y Condiciones</Text>
        <Text style={styles.lastUpdated}>Última actualización: 22 de Julio, 2026</Text>

        <Text style={styles.sectionTitle}>1. Aceptación de los Términos</Text>
        <Text style={styles.paragraph}>
          Al descargar, instalar o utilizar BeeApp AI, usted acepta quedar sujeto a estos Términos y Condiciones de Uso. Si no está de acuerdo con alguna parte de los términos descritos aquí, no debe acceder ni utilizar ninguno de nuestros servicios.
        </Text>

        <Text style={styles.sectionTitle}>2. Descripción del Servicio</Text>
        <Text style={styles.paragraph}>
          BeeApp AI provee una plataforma móvil y web de comunicación corporativa y productividad laboral. La herramienta facilita la mensajería interna, la colaboración por canales, la gestión de chats grupales y el uso de asistentes inteligentes basados en IA.
        </Text>

        <Text style={styles.sectionTitle}>3. Cuenta de Usuario y Registro</Text>
        <Text style={styles.paragraph}>
          Para registrarse, debe proveer un número de teléfono celular activo de Colombia. Usted es el único responsable de la seguridad de su código OTP de verificación y de restringir el acceso a su dispositivo para proteger su cuenta.
        </Text>

        <Text style={styles.sectionTitle}>4. Propiedad Intelectual</Text>
        <Text style={styles.paragraph}>
          Toda la tecnología, marcas, código de programación, interfaces gráficas, logotipos y base de datos de BeeApp AI son propiedad exclusiva de la empresa y están protegidos por las leyes locales e internacionales de propiedad intelectual.
        </Text>

        <Text style={styles.sectionTitle}>5. Limitación de Responsabilidad</Text>
        <Text style={styles.paragraph}>
          El servicio se proporciona "tal cual" y "según disponibilidad". No garantizamos que el funcionamiento de la plataforma sea 100% ininterrumpido o libre de errores de red. No nos hacemos responsables de pérdidas financieras o de información que ocurran por incidentes ajenos a nuestro control de infraestructura.
        </Text>

        <Text style={styles.sectionTitle}>6. Ley Aplicable y Jurisdicción</Text>
        <Text style={styles.paragraph}>
          Estos términos se rigen por las leyes de la República de Colombia. Cualquier disputa derivada del uso del servicio se resolverá ante los tribunales competentes de este país.
        </Text>

        <Text style={styles.sectionTitle}>7. Contacto</Text>
        <Text style={styles.paragraph}>
          Para soporte, sugerencias o aclaraciones legales, puede escribirnos a soporte@beeapp.ai o consultar directamente con el administrador asignado por su empresa.
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
    fontWeight: '600',
    color: colors.neutral.text,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
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
    fontWeight: '800',
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
    fontWeight: '700',
    color: colors.neutral.text,
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: colors.neutral.gray700,
    lineHeight: 22,
    marginBottom: 16,
    textAlign: 'justify',
  },
});
