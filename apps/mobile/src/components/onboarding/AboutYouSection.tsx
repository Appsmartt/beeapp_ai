import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { colors } from '@beeapp/design-system';
import { Camera } from 'lucide-react-native';
import { sharedStyles as styles, getInitials } from './onboardingShared';

interface AboutYouSectionProps {
  name: string;
  onNameChange: (value: string) => void;
  email: string;
  onEmailChange: (value: string) => void;
  occupation: string;
  onOccupationChange: (value: string) => void;
  address: string;
  onAddressChange: (value: string) => void;
  hasPhoto: boolean;
  onTogglePhoto: () => void;
}

export default function AboutYouSection({
  name,
  onNameChange,
  email,
  onEmailChange,
  occupation,
  onOccupationChange,
  address,
  onAddressChange,
  hasPhoto,
  onTogglePhoto,
}: AboutYouSectionProps) {
  // Validate email format in UI
  const isEmailValid = email.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionHeader}>Sobre Ti</Text>

      {/* Avatar selection mock */}
      <View style={styles.avatarRow}>
        <TouchableOpacity style={styles.avatarButton} activeOpacity={0.8} onPress={onTogglePhoto}>
          {hasPhoto ? (
            <View style={[styles.avatarCircle, styles.avatarActive]}>
              <Text style={styles.avatarText}>{getInitials(name) || 'YO'}</Text>
              <View style={styles.avatarCheckBadge}>
                <Text style={styles.avatarCheckText}>✓</Text>
              </View>
            </View>
          ) : (
            <View style={styles.avatarCircle}>
              <Camera size={24} color={colors.neutral.gray600} />
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.avatarInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <Text style={styles.avatarInfoTitle}>Foto de Perfil</Text>
            <View style={{ backgroundColor: colors.neutral.gray200, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 6 }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: colors.neutral.gray600, textTransform: 'uppercase' }}>Opcional</Text>
            </View>
          </View>
          <Text style={styles.avatarInfoDesc}>
            {hasPhoto ? 'Foto cargada (Simulado)' : 'Toca para cargar'}
          </Text>
        </View>
      </View>

      {/* Inputs */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Nombre Completo *</Text>
        <TextInput
          style={styles.inputField}
          placeholder="Ingresa tu nombre y apellido"
          placeholderTextColor={colors.neutral.gray500}
          value={name}
          onChangeText={onNameChange}
        />
      </View>

      {/* New Email Field */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Correo Electrónico *</Text>
        <TextInput
          style={[
            styles.inputField,
            !isEmailValid && { borderColor: colors.semantic.error, borderWidth: 1 }
          ]}
          placeholder="Ingresa tu correo electrónico"
          placeholderTextColor={colors.neutral.gray500}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={onEmailChange}
        />
        {!isEmailValid && (
          <Text style={{ color: colors.semantic.error, fontSize: 11, marginTop: 4 }}>
            Ingresa un formato de correo válido.
          </Text>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>¿A qué te dedicas?</Text>
        <TextInput
          style={styles.inputField}
          placeholder="Ej. Desarrollador, Gerente, Diseñador"
          placeholderTextColor={colors.neutral.gray500}
          value={occupation}
          onChangeText={onOccupationChange}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Ciudad o Dirección</Text>
        <TextInput
          style={styles.inputField}
          placeholder="Ej. Bogotá, Colombia"
          placeholderTextColor={colors.neutral.gray500}
          value={address}
          onChangeText={onAddressChange}
        />
      </View>
    </View>
  );
}
