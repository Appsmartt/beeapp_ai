import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors } from '@beeapp/design-system';
import { Fingerprint, ScanFace, CheckCircle2 } from 'lucide-react-native';

interface BiometricButtonProps {
  method: 'fingerprint' | 'faceid';
  onSuccess: () => void;
  title?: string;
}

export default function BiometricButton({ method, onSuccess, title }: BiometricButtonProps) {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success'>('idle');

  const handlePress = () => {
    if (status !== 'idle') return;
    setStatus('scanning');

    // Simulate scanning
    setTimeout(() => {
      setStatus('success');
      // Show checkmark for 1 second, then invoke success callback
      setTimeout(() => {
        setStatus('idle');
        onSuccess();
      }, 1000);
    }, 1200);
  };

  const Icon = method === 'faceid' ? ScanFace : Fingerprint;
  const methodLabel = method === 'faceid' ? 'Face ID' : 'Huella dactilar';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          status === 'scanning' && styles.buttonScanning,
          status === 'success' && styles.buttonSuccess,
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
        disabled={status !== 'idle'}
      >
        {status === 'idle' && (
          <Icon size={44} color={colors.brand.primary} />
        )}
        {status === 'scanning' && (
          <ActivityIndicator size="large" color={colors.brand.primary} />
        )}
        {status === 'success' && (
          <CheckCircle2 size={44} color={colors.semantic.success} />
        )}
      </TouchableOpacity>
      <Text style={styles.title}>
        {status === 'idle'
          ? title || `Tocar para autenticar con ${methodLabel}`
          : status === 'scanning'
          ? 'Verificando identidad...'
          : 'Identidad verificada'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  button: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.brand.primary + '10',
    borderWidth: 1.5,
    borderColor: colors.brand.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  buttonScanning: {
    borderColor: colors.brand.primary,
  },
  buttonSuccess: {
    backgroundColor: colors.semantic.success + '10',
    borderColor: colors.semantic.success,
  },
  title: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.neutral.gray600,
    textAlign: 'center',
  },
});
