import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { colors } from '@beeapp/design-system';
import { ShieldCheck } from 'lucide-react-native';
import { StorageItem } from '../../stores/storageStore';

interface SignatureDocPreviewProps {
  fileItem: StorageItem;
  isPositioned: boolean;
  signaturePosition: 'bottom-left' | 'bottom-right';
  onPositionChange: (pos: 'bottom-left' | 'bottom-right') => void;
}

export default function SignatureDocPreview({
  fileItem,
  isPositioned,
  signaturePosition,
  onPositionChange,
}: SignatureDocPreviewProps) {
  return (
    <>
      {/* Document Preview Viewport */}
      <Text style={styles.sectionTitle}>Documento a Firmar</Text>
      <View style={styles.docWrapper}>
        <View style={styles.miniDocCard}>
          <Text style={styles.miniDocTitle}>{fileItem.name}</Text>
          <Text style={styles.miniDocSub}>ACUERDO DE CONFIDENCIALIDAD</Text>

          <View style={styles.dummyDocLines}>
            <View style={[styles.dummyLine, { width: '90%' }]} />
            <View style={[styles.dummyLine, { width: '95%' }]} />
            <View style={[styles.dummyLine, { width: '40%' }]} />
          </View>

          {/* Signature placement area */}
          <View style={styles.placementContainer}>
            <Text style={styles.placementLabel}>Ubicación de la firma:</Text>
            <View style={styles.positionButtons}>
              <TouchableOpacity
                style={[styles.posBtn, signaturePosition === 'bottom-left' && styles.posBtnActive]}
                onPress={() => onPositionChange('bottom-left')}
              >
                <Text
                  style={[
                    styles.posBtnText,
                    signaturePosition === 'bottom-left' && styles.posBtnTextActive,
                  ]}
                >
                  Izquierda
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.posBtn, signaturePosition === 'bottom-right' && styles.posBtnActive]}
                onPress={() => onPositionChange('bottom-right')}
              >
                <Text
                  style={[
                    styles.posBtnText,
                    signaturePosition === 'bottom-right' && styles.posBtnTextActive,
                  ]}
                >
                  Derecha
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Simulated positioned signature stamp */}
          {isPositioned && (
            <View
              style={[
                styles.signatureStamp,
                signaturePosition === 'bottom-left' ? styles.stampLeft : styles.stampRight,
              ]}
            >
              <Text style={styles.stampSigText}>Santiago V.</Text>
              <View style={styles.stampLine} />
              <Text style={styles.stampSigner}>Santiago Valencia</Text>
              <Text style={styles.stampDate}>Firma Digital BeeAI</Text>
            </View>
          )}
        </View>
      </View>

      {/* Audit / Summary Card */}
      <Text style={styles.sectionTitle}>Resumen de Auditoría</Text>
      <View style={styles.auditCard}>
        <View style={styles.auditRow}>
          <Text style={styles.auditLabel}>Documento:</Text>
          <Text style={styles.auditValue} numberOfLines={1}>
            {fileItem.name}
          </Text>
        </View>
        <View style={styles.auditRow}>
          <Text style={styles.auditLabel}>Firmante:</Text>
          <Text style={styles.auditValue}>Santiago Valencia</Text>
        </View>
        <View style={styles.auditRow}>
          <Text style={styles.auditLabel}>Cargo:</Text>
          <Text style={styles.auditValue}>CEO & Consultor Estratégico</Text>
        </View>
        <View style={[styles.auditRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
          <Text style={styles.auditLabel}>Proveedor:</Text>
          <View style={styles.auditProvider}>
            <ShieldCheck size={14} color="#7C3AED" />
            <Text style={styles.auditProviderText}>Criptografía BeeAI</Text>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
  },
  docWrapper: {
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 20,
  },
  miniDocCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 16,
    minHeight: 220,
    position: 'relative',
  },
  miniDocTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brand.primary,
    marginBottom: 4,
  },
  miniDocSub: {
    fontSize: 10,
    fontWeight: '400',
    color: colors.neutral.gray700,
    marginBottom: 12,
  },
  dummyDocLines: {
    gap: 6,
  },
  dummyLine: {
    height: 6,
    backgroundColor: colors.neutral.gray200,
    borderRadius: 3,
  },
  placementContainer: {
    marginTop: 20,
  },
  placementLabel: {
    fontSize: 10,
    fontWeight: '400',
    color: colors.neutral.gray600,
    marginBottom: 6,
  },
  positionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  posBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
  },
  posBtnActive: {
    borderColor: colors.brand.primary,
    backgroundColor: '#FAF5FF',
  },
  posBtnText: {
    fontSize: 10,
    fontWeight: '400',
    color: colors.neutral.gray700,
  },
  posBtnTextActive: {
    color: colors.brand.primary,
    fontWeight: '600',
  },
  signatureStamp: {
    position: 'absolute',
    bottom: 16,
    width: 100,
    alignItems: 'center',
  },
  stampLeft: {
    left: 16,
  },
  stampRight: {
    right: 16,
  },
  stampSigText: {
    fontFamily: Platform.OS === 'ios' ? 'Zapfino' : 'cursive',
    fontSize: 12,
    color: '#1E3A8A',
    transform: [{ rotate: '-4deg' }],
  },
  stampLine: {
    width: '100%',
    height: 1,
    backgroundColor: colors.neutral.gray400,
    marginVertical: 2,
  },
  stampSigner: {
    fontSize: 7,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  stampDate: {
    fontSize: 6,
    color: colors.neutral.gray600,
    fontWeight: '400',
  },
  auditCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 16,
  },
  auditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  auditLabel: {
    fontSize: 12,
    color: colors.neutral.gray600,
    fontWeight: '400',
  },
  auditValue: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.text,
    maxWidth: 200,
  },
  auditProvider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  auditProviderText: {
    fontSize: 11,
    color: '#7C3AED',
    fontWeight: '400',
  },
});
