import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@beeapp/design-system';
import { ChevronLeft, Camera, Building, Sparkles } from 'lucide-react-native';
import FloatingTabBar from '../../../src/components/FloatingTabBar';

const TONOS_ASISTENTE = [
  { id: 'amable', label: 'Amable', desc: 'Trato cálido y cercano.' },
  { id: 'serio', label: 'Serio', desc: 'Trato formal y corporativo.' },
  { id: 'directo', label: 'Directo', desc: 'Respuestas cortas y concisas.' },
];

const OFERTAS_EMPRESA = [
  { id: 'productos', label: 'Productos' },
  { id: 'servicios', label: 'Servicios' },
  { id: 'ambos', label: 'Ambos' },
];

export default function EditProfileScreen() {
  const router = useRouter();

  // Initial Mock Profile State
  const [name, setName] = useState('Santiago Valencia');
  const [occupation, setOccupation] = useState('CEO & Consultor Estratégico');
  const [location, setLocation] = useState('Bogotá, Colombia');

  // Corporate Section Collapsible State
  const [hasCompany, setHasCompany] = useState(true);
  const [companyName, setCompanyName] = useState('Consultores Asociados S.A.S.');
  const [offerType, setOfferType] = useState('servicios');
  const [whatSells, setWhatSells] = useState('Asesorías y planeación estratégica para pymes');

  // Assistant Section State
  const [assistantName, setAssistantName] = useState('BeeAI');
  const [assistantTone, setAssistantTone] = useState('amable');

  const handleSave = () => {
    if (!name.trim()) {
      alert('El nombre es obligatorio.');
      return;
    }
    alert('Cambios guardados con éxito.');
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header - AJUSTE 3: Removed header save button, keeping it symmetric */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Editar Perfil</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Avatar Setup */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarCircleBig}>
              <Text style={styles.avatarTextBig}>SV</Text>
              <TouchableOpacity style={styles.cameraBadge} activeOpacity={0.8} onPress={() => alert('Selector de foto mock')}>
                <Camera size={14} color={colors.neutral.white} />
              </TouchableOpacity>
            </View>
            <Text style={styles.avatarTip}>Cambiar foto de perfil</Text>
          </View>

          {/* Form: Mi Perfil */}
          <Text style={styles.sectionTitle}>Datos Personales</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nombre Completo *</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Ingresa tu nombre..."
              placeholderTextColor={colors.neutral.gray500}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>¿A qué te dedicas? *</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Ej. Desarrollador, Abogado..."
              placeholderTextColor={colors.neutral.gray500}
              value={occupation}
              onChangeText={setOccupation}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Ciudad o Dirección</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Ej. Bogotá, Colombia..."
              placeholderTextColor={colors.neutral.gray500}
              value={location}
              onChangeText={setLocation}
            />
          </View>

          {/* Collapsible Empresa Section */}
          <TouchableOpacity
            style={styles.collapsibleHeader}
            onPress={() => setHasCompany(!hasCompany)}
            activeOpacity={0.7}
          >
            <View style={styles.collapsibleHeaderLeft}>
              <Building size={18} color={colors.brand.primary} style={{ marginRight: 10 }} />
              <Text style={styles.collapsibleTitle}>Datos de Empresa</Text>
            </View>
            {hasCompany ? (
              <Building size={18} color="transparent" />
            ) : (
              <Building size={18} color="transparent" />
            )}
          </TouchableOpacity>

          {hasCompany && (
            <View style={styles.collapsibleContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nombre de la Empresa</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="Nombre corporativo"
                  placeholderTextColor={colors.neutral.gray500}
                  value={companyName}
                  onChangeText={setCompanyName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tipo de Oferta</Text>
                <View style={styles.offerRow}>
                  {OFERTAS_EMPRESA.map((item) => {
                    const isSelected = offerType === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.offerCard, isSelected && styles.offerCardActive]}
                        onPress={() => setOfferType(item.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.offerCardText, isSelected && styles.offerCardTextActive]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>¿Qué vendes / ofreces?</Text>
                <TextInput
                  style={[styles.inputField, { height: 60 }]}
                  placeholder="Describe tus servicios o productos..."
                  placeholderTextColor={colors.neutral.gray500}
                  multiline
                  value={whatSells}
                  onChangeText={setWhatSells}
                />
              </View>
            </View>
          )}

          {/* Form: Configuración del Asistente */}
          <Text style={styles.sectionTitle}>Configuración del Asistente BeeAI</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nombre del Asistente</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Ej. Jarvis, BeeAI..."
              placeholderTextColor={colors.neutral.gray500}
              value={assistantName}
              onChangeText={setAssistantName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tono del Trato</Text>
            <View style={styles.toneListCol}>
              {TONOS_ASISTENTE.map((tono) => {
                const isSelected = assistantTone === tono.id;
                return (
                  <TouchableOpacity
                    key={tono.id}
                    style={[styles.toneCard, isSelected && styles.toneCardActive]}
                    onPress={() => setAssistantTone(tono.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.toneCardHeader}>
                      <Text style={[styles.toneCardLabel, isSelected && styles.toneCardLabelActive]}>
                        {tono.label}
                      </Text>
                      {isSelected && <Sparkles size={14} color={colors.brand.primary} />}
                    </View>
                    <Text style={styles.toneCardDesc}>{tono.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actionsBar}>
            <TouchableOpacity
              style={styles.discardBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Text style={styles.discardBtnText}>Descartar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Text style={styles.saveBtnText}>Guardar Cambios</Text>
            </TouchableOpacity>
          </View>

          {/* Clearance for the floating menu */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Assistant always within reach */}
        <FloatingTabBar />
      </View>
    </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.neutral.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarCircleBig: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#DDD6FE',
    position: 'relative',
    marginBottom: 10,
  },
  avatarTextBig: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.brand.primary,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brand.primary,
    borderWidth: 2.5,
    borderColor: colors.neutral.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTip: {
    fontSize: 12,
    color: colors.neutral.gray600,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.gray700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputField: {
    backgroundColor: colors.neutral.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.neutral.text,
    fontWeight: '500',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral.white,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    marginTop: 8,
    marginBottom: 14,
  },
  collapsibleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  collapsibleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  collapsibleContent: {
    backgroundColor: colors.neutral.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    marginBottom: 20,
  },
  offerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  offerCard: {
    flex: 1,
    backgroundColor: colors.neutral.gray50,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  offerCardActive: {
    borderColor: colors.brand.primary,
    backgroundColor: '#F5F3FF',
  },
  offerCardText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.gray700,
  },
  offerCardTextActive: {
    color: colors.brand.primary,
    fontWeight: '700',
  },
  toneListCol: {
    gap: 10,
  },
  toneCard: {
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: 12,
    padding: 14,
  },
  toneCardActive: {
    borderColor: colors.brand.primary,
    backgroundColor: '#F5F3FF',
  },
  toneCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  toneCardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  toneCardLabelActive: {
    color: colors.brand.primary,
  },
  toneCardDesc: {
    fontSize: 11,
    color: colors.neutral.gray600,
    fontWeight: '500',
  },
  actionsBar: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
    marginBottom: 40,
  },
  discardBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  discardBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.gray700,
  },
  saveBtn: {
    flex: 1.5,
    backgroundColor: colors.brand.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.white,
  },
});
