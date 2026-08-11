import { Text, TextInput, View } from 'react-native';
import { colors } from '@beeapp/design-system';

import { sharedStyles as styles } from './onboardingShared';

interface AboutYouSectionProps {
  occupation: string;
  onOccupationChange: (value: string) => void;
  location: string;
  onLocationChange: (value: string) => void;
  occupationError?: string;
  locationError?: string;
}

export default function AboutYouSection({
  occupation,
  onOccupationChange,
  location,
  onLocationChange,
  occupationError,
  locationError,
}: AboutYouSectionProps) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionHeader}>Sobre ti</Text>

      <Text style={styles.sectionSubtitle}>
        Esta información nos ayuda a personalizar tu experiencia.
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>¿A qué te dedicas? *</Text>

        <TextInput
          style={[
            styles.inputField,
            occupationError && styles.inputFieldError,
          ]}
          placeholder="Ej. Desarrollador, gerente, diseñador"
          placeholderTextColor={colors.neutral.gray500}
          value={occupation}
          onChangeText={onOccupationChange}
          autoCapitalize="sentences"
        />

        {occupationError ? (
          <Text style={styles.errorText}>{occupationError}</Text>
        ) : null}
      </View>

      <View style={styles.inputGroupLast}>
        <Text style={styles.inputLabel}>Ciudad o dirección *</Text>

        <TextInput
          style={[
            styles.inputField,
            locationError && styles.inputFieldError,
          ]}
          placeholder="Ej. Bogotá, Colombia"
          placeholderTextColor={colors.neutral.gray500}
          value={location}
          onChangeText={onLocationChange}
          autoCapitalize="sentences"
        />

        {locationError ? (
          <Text style={styles.errorText}>{locationError}</Text>
        ) : null}
      </View>
    </View>
  );
}