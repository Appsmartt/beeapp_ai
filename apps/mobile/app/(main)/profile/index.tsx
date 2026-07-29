import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Linking,
  Alert,
  Switch,
} from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useRouter } from 'expo-router';
import { colors } from '@beeapp/design-system';
import {
  User,
  ChevronRight,
  Shield,
  CreditCard,
  Grid,
  ShieldCheck,
  Share2,
  HelpCircle,
  FileText,
  LogOut,
} from 'lucide-react-native';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import { CURRENT_USER } from '../../../src/mocks/currentUser';

export default function ProfileMainScreen() {
  const router = useRouter();
  const [isVisibleInNetwork, setIsVisibleInNetwork] = useState(true);

  // Mock User profile info: personal data only, no company
  const userProfile = {
    name: CURRENT_USER.name,
    email: CURRENT_USER.email,
    initials: CURRENT_USER.initials,
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: '¡Descarga BeeApp AI! La plataforma definitiva para optimizar tus correos, notas, archivos y automatizar tu negocio con IA. Descárgala aquí: https://beeapp.ai',
      });
    } catch (error) {
      console.log('Error compartiendo la app:', error);
    }
  };

  const handleContactSupport = () => {
    const supportPhone = '573001234567'; // Colombian mock support number
    const message = 'Hola soporte de BeeApp, necesito ayuda con mi cuenta.';
    const url = `https://wa.me/${supportPhone}?text=${encodeURIComponent(message)}`;
    
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Error', 'No se pudo abrir WhatsApp en este dispositivo.');
        }
      })
      .catch((err) => console.error('An error occurred', err));
  };

  const handleSignOut = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas cerrar sesión en BeeApp?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: () => {
            // Replace navigation to auth login
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const navigateTo = (path: string) => {
    router.push(path);
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header Title */}
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>Mi Perfil</Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Profile Card Header */}
          <View style={styles.profileCard}>
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarText}>{userProfile.initials}</Text>
              <View style={styles.onlineBadge} />
            </View>
            <Text style={styles.profileName}>{userProfile.name}</Text>
            <Text style={styles.profileOccupation}>{userProfile.email}</Text>

            <TouchableOpacity
              style={styles.editProfileBtn}
              onPress={() => navigateTo('/(main)/profile/edit')}
              activeOpacity={0.7}
            >
              <Text style={styles.editProfileBtnText}>Editar Perfil</Text>
            </TouchableOpacity>
          </View>

          {/* Group 1: Mi Cuenta - AJUSTE 2: Removed "Información de Perfil" list item to avoid duplication */}
          <Text style={styles.groupHeader}>Mi Cuenta</Text>
          <View style={styles.optionsCard}>
            <TouchableOpacity style={styles.optionRow} onPress={() => navigateTo('/(main)/profile/subscription')} activeOpacity={0.7}>
              <View style={[styles.optionIconWrap, { backgroundColor: '#FEF3C7' }]}>
                <CreditCard size={18} color="#D97706" />
              </View>
              <Text style={styles.optionLabel}>Suscripción y Almacenamiento</Text>
              <ChevronRight size={16} color={colors.neutral.gray500} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionRow} onPress={() => navigateTo('/(main)/profile/integrations')} activeOpacity={0.7}>
              <View style={[styles.optionIconWrap, { backgroundColor: '#EBF5FF' }]}>
                <Grid size={18} color="#1E88E5" />
              </View>
              <Text style={styles.optionLabel}>Integraciones Externas</Text>
              <ChevronRight size={16} color={colors.neutral.gray500} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionRow} onPress={() => navigateTo('/(main)/profile/security')} activeOpacity={0.7}>
              <View style={[styles.optionIconWrap, { backgroundColor: '#DCFCE7' }]}>
                <ShieldCheck size={18} color="#2E7D32" />
              </View>
              <Text style={styles.optionLabel}>Seguridad y PIN</Text>
              <ChevronRight size={16} color={colors.neutral.gray500} />
            </TouchableOpacity>

            {/* Visibility toggle switch */}
            <View style={styles.switchOptionRow}>
              <View style={[styles.optionIconWrap, { backgroundColor: '#F3E8FF' }]}>
                <Shield size={18} color={colors.brand.primary} />
              </View>
              <View style={styles.switchTextCol}>
                <Text style={styles.optionLabel}>Visibilidad en la red</Text>
                <Text style={styles.switchDesc}>
                  Permite que otros usuarios te encuentren según tu profesión, empresa e intereses registrados.
                </Text>
              </View>
              <Switch
                value={isVisibleInNetwork}
                onValueChange={setIsVisibleInNetwork}
                trackColor={{ false: colors.neutral.gray300, true: colors.brand.primary + '80' }}
                thumbColor={isVisibleInNetwork ? colors.brand.primary : colors.neutral.gray400}
              />
            </View>
          </View>

          {/* Group 2: Aplicación */}
          <Text style={styles.groupHeader}>Aplicación</Text>
          <View style={styles.optionsCard}>
            <TouchableOpacity style={styles.optionRow} onPress={handleShareApp} activeOpacity={0.7}>
              <View style={[styles.optionIconWrap, { backgroundColor: '#E8F5E9' }]}>
                <Share2 size={18} color="#2E7D32" />
              </View>
              <Text style={styles.optionLabel}>Compartir Aplicación</Text>
              <ChevronRight size={16} color={colors.neutral.gray500} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.optionRow, { borderBottomWidth: 0 }]} onPress={handleContactSupport} activeOpacity={0.7}>
              <View style={[styles.optionIconWrap, { backgroundColor: '#E0F2FE' }]}>
                <HelpCircle size={18} color="#0284C7" />
              </View>
              <Text style={styles.optionLabel}>Contactar a Soporte</Text>
              <ChevronRight size={16} color={colors.neutral.gray500} />
            </TouchableOpacity>
          </View>

          {/* Group 3: Legal */}
          <Text style={styles.groupHeader}>Legal</Text>
          <View style={styles.optionsCard}>
            <TouchableOpacity style={styles.optionRow} onPress={() => navigateTo('/(auth)/terms')} activeOpacity={0.7}>
              <View style={[styles.optionIconWrap, { backgroundColor: '#F3E8FF' }]}>
                <FileText size={18} color={colors.brand.primary} />
              </View>
              <Text style={styles.optionLabel}>Términos y Condiciones</Text>
              <ChevronRight size={16} color={colors.neutral.gray500} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.optionRow, { borderBottomWidth: 0 }]} onPress={() => navigateTo('/(auth)/privacy')} activeOpacity={0.7}>
              <View style={[styles.optionIconWrap, { backgroundColor: '#F3E8FF' }]}>
                <Shield size={18} color={colors.brand.primary} />
              </View>
              <Text style={styles.optionLabel}>Política de Privacidad</Text>
              <ChevronRight size={16} color={colors.neutral.gray500} />
            </TouchableOpacity>
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <LogOut size={18} color={colors.semantic.error} style={{ marginRight: 8 }} />
            <Text style={styles.signOutBtnText}>Cerrar Sesión</Text>
          </TouchableOpacity>

          {/* Version text */}
          <Text style={styles.versionText}>BeeApp AI v1.0.0 (Build 1425)</Text>

          {/* Extra spacing for tab bar */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Tab Bar navigation */}
        <FloatingTabBar activeTab="profile" />
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.gray50,
  },
  container: {
    flex: 1,
  },
  headerBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.neutral.text,
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    position: 'relative',
    borderWidth: 2,
    borderColor: '#DDD6FE',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.brand.primary,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.semantic.success,
    borderWidth: 2.5,
    borderColor: colors.neutral.white,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.neutral.text,
    marginBottom: 4,
  },
  profileOccupation: {
    fontSize: 13,
    color: colors.neutral.gray600,
    fontWeight: '600',
    marginBottom: 10,
  },
  editProfileBtn: {
    backgroundColor: colors.neutral.gray100,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  editProfileBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  groupHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: 24,
    marginTop: 20,
    marginBottom: 8,
  },
  optionsCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  optionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.text,
    flex: 1,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 16,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginTop: 32,
    marginBottom: 16,
  },
  signOutBtnText: {
    color: colors.semantic.error,
    fontSize: 15,
    fontWeight: '700',
  },
  versionText: {
    fontSize: 11,
    color: colors.neutral.gray500,
    textAlign: 'center',
    fontWeight: '500',
  },
  switchOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  switchTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  switchDesc: {
    fontSize: 10,
    color: colors.neutral.gray600,
    marginTop: 2,
    lineHeight: 14,
    fontWeight: '500',
  },
});
