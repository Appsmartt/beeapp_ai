
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '@beeapp/design-system';
import { Building2, Package, Wrench, RefreshCw } from 'lucide-react-native';
import { sharedStyles, getInitials } from './onboardingShared';

export type OfferingType = 'products' | 'services' | 'both';

interface BusinessSectionProps {
  hasBusiness: boolean;
  onHasBusinessChange: (value: boolean) => void;
  businessName: string;
  onBusinessNameChange: (value: string) => void;
  hasBusinessLogo: boolean;
  onToggleLogo: () => void;
  offeringType: OfferingType;
  onOfferingTypeChange: (value: OfferingType) => void;
  whatYouSell: string;
  onWhatYouSellChange: (value: string) => void;
}

export default function BusinessSection({
  hasBusiness,
  onHasBusinessChange,
  businessName,
  onBusinessNameChange,
  hasBusinessLogo,
  onToggleLogo,
  offeringType,
  onOfferingTypeChange,
  whatYouSell,
  onWhatYouSellChange,
}: BusinessSectionProps) {
  return (
    <View style={sharedStyles.sectionCard}>
      <View style={styles.businessToggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={sharedStyles.sectionHeader}>Tu Negocio / Empresa</Text>
          <Text style={sharedStyles.sectionSubtitle}>¿Tienes un negocio propio? (Opcional)</Text>
        </View>
        <View style={styles.toggleButtons}>
          <TouchableOpacity
            style={[styles.toggleBtn, !hasBusiness && styles.toggleBtnActive]}
            onPress={() => onHasBusinessChange(false)}
          >
            <Text style={[styles.toggleBtnText, !hasBusiness && styles.toggleBtnTextActive]}>No</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, hasBusiness && styles.toggleBtnActive]}
            onPress={() => onHasBusinessChange(true)}
          >
            <Text style={[styles.toggleBtnText, hasBusiness && styles.toggleBtnTextActive]}>Sí</Text>
          </TouchableOpacity>
        </View>
      </View>

      {hasBusiness && (
        <View style={styles.businessExpandedArea}>
          {/* Business Logo Selection Mock */}
          <View style={sharedStyles.avatarRow}>
            <TouchableOpacity style={styles.logoButton} activeOpacity={0.8} onPress={onToggleLogo}>
              {hasBusinessLogo ? (
                <View style={[styles.logoCircle, sharedStyles.avatarActive]}>
                  <Text style={styles.logoText}>{getInitials(businessName) || 'CORP'}</Text>
                  <View style={sharedStyles.avatarCheckBadge}>
                    <Text style={sharedStyles.avatarCheckText}>✓</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.logoCircle}>
                  <Building2 size={24} color={colors.neutral.gray600} />
                </View>
              )}
            </TouchableOpacity>
            <View style={sharedStyles.avatarInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                <Text style={sharedStyles.avatarInfoTitle}>Logo de la Empresa</Text>
                <View style={{ backgroundColor: colors.neutral.gray200, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 6 }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: colors.neutral.gray600, textTransform: 'uppercase' }}>Opcional</Text>
                </View>
              </View>
              <Text style={sharedStyles.avatarInfoDesc}>
                {hasBusinessLogo ? 'Logo cargado (Simulado)' : 'Toca para cargar'}
              </Text>
            </View>
          </View>

          <View style={sharedStyles.inputGroup}>
            <Text style={sharedStyles.inputLabel}>Nombre de la Empresa</Text>
            <TextInput
              style={sharedStyles.inputField}
              placeholder="Ej. Consultores Asociados S.A.S."
              placeholderTextColor={colors.neutral.gray500}
              value={businessName}
              onChangeText={onBusinessNameChange}
            />
          </View>

          {/* Offering Type Selector */}
          <View style={sharedStyles.inputGroup}>
            <Text style={sharedStyles.inputLabel}>¿Qué Ofreces?</Text>
            <View style={styles.selectorRow}>
              <TouchableOpacity
                style={[styles.selectorCard, offeringType === 'products' && styles.selectorCardActive]}
                onPress={() => onOfferingTypeChange('products')}
              >
                <View style={styles.selectorIconTextRow}>
                  <Package size={14} color={offeringType === 'products' ? colors.brand.primary : colors.neutral.gray600} style={styles.selectorIcon} />
                  <Text style={[styles.selectorCardText, offeringType === 'products' && styles.selectorCardTextActive]}>Productos</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.selectorCard, offeringType === 'services' && styles.selectorCardActive]}
                onPress={() => onOfferingTypeChange('services')}
              >
                <View style={styles.selectorIconTextRow}>
                  <Wrench size={14} color={offeringType === 'services' ? colors.brand.primary : colors.neutral.gray600} style={styles.selectorIcon} />
                  <Text style={[styles.selectorCardText, offeringType === 'services' && styles.selectorCardTextActive]}>Servicios</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.selectorCard, offeringType === 'both' && styles.selectorCardActive]}
                onPress={() => onOfferingTypeChange('both')}
              >
                <View style={styles.selectorIconTextRow}>
                  <RefreshCw size={14} color={offeringType === 'both' ? colors.brand.primary : colors.neutral.gray600} style={styles.selectorIcon} />
                  <Text style={[styles.selectorCardText, offeringType === 'both' && styles.selectorCardTextActive]}>Ambos</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={sharedStyles.inputGroup}>
            <Text style={sharedStyles.inputLabel}>¿Qué Vendes exactamente?</Text>
            <TextInput
              style={sharedStyles.inputField}
              placeholder="Ej. Zapatos deportivos, software contable..."
              placeholderTextColor={colors.neutral.gray500}
              value={whatYouSell}
              onChangeText={onWhatYouSellChange}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  businessToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleButtons: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.gray100,
    padding: 3,
    borderRadius: 10,
  },
  toggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: colors.neutral.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.neutral.gray600,
  },
  toggleBtnTextActive: {
    color: colors.neutral.text,
  },
  businessExpandedArea: {
    marginTop: 20,
    borderTopWidth: 1,
    borderColor: colors.neutral.gray100,
    paddingTop: 20,
  },
  logoButton: {
    marginRight: 16,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: colors.neutral.gray100,
    borderWidth: 2,
    borderColor: colors.neutral.gray300,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoText: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.neutral.white,
  },
  logoPlaceholderText: {
    fontSize: 8,
    fontWeight: '400',
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
  },
  selectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  selectorCard: {
    flex: 1,
    backgroundColor: colors.neutral.gray50,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  selectorCardActive: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.neutral.white,
    borderWidth: 1.5,
  },
  selectorCardText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray600,
  },
  selectorCardTextActive: {
    color: colors.brand.primary,
    fontWeight: '600',
  },
  selectorIconTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectorIcon: {
    marginRight: 4,
  },
});
