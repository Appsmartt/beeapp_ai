import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useModuleNav, useScreenParams } from '../../../src/components/embedded/EmbeddedNavContext';
import { colors } from '@beeapp/design-system';
import {
  ChevronLeft,
  PenTool,
  Check,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react-native';
import { getItems, setItems, StorageItem } from '../../../src/stores/storageStore';

export default function SignDocumentScreen() {
  const router = useModuleNav();
  const params = useScreenParams();
  const fileId = params.id as string;

  const [fileItem, setFileItem] = useState<StorageItem | null>(null);

  // Signature States
  const [signatureMode, setSignatureMode] = useState<'draw' | 'saved'>('draw');
  const [isDrawn, setIsDrawn] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);
  const [signaturePosition, setSignaturePosition] = useState<'bottom-left' | 'bottom-right'>('bottom-right');

  useEffect(() => {
    if (fileId) {
      const found = getItems().find((item) => item.id === fileId);
      if (found) {
        setFileItem(found);
      }
    }
  }, [fileId]);

  if (!fileItem) {
    return (
      <ScreenSafeArea style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Archivo no encontrado</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </ScreenSafeArea>
    );
  }

  const handleClearSignature = () => {
    setIsDrawn(false);
    setIsPositioned(false);
  };

  const handleDrawSimulate = () => {
    setIsDrawn(true);
    setIsPositioned(true);
  };

  const handleConfirmSignature = () => {
    if (signatureMode === 'draw' && !isDrawn) {
      Alert.alert('Firma requerida', 'Por favor dibuja tu firma o selecciona una firma guardada.');
      return;
    }
    if (!isPositioned) {
      Alert.alert('Posición requerida', 'Por favor posiciona tu firma sobre el documento.');
      return;
    }

    // Update in memory store
    const today = new Date();
    const timeStr = today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = today.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const formattedDate = `${dateStr}, ${timeStr}`;

    const updated = getItems().map((item) => {
      if (item.id === fileItem.id) {
        return {
          ...item,
          isSigned: true,
          signerName: 'Santiago Valencia',
          signedAt: formattedDate,
        };
      }
      return item;
    });

    setItems(updated);

    Alert.alert(
      'Documento Firmado',
      'El NDA ha sido firmado digitalmente y se ha generado el sello de auditoría de BeeAI.',
      [
        {
          text: 'Entendido',
          onPress: () => {
            // Navigate back to preview/index
            router.replace({
              pathname: '/(main)/storage',
            });
          },
        },
      ]
    );
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Firmar Documento</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
                    onPress={() => setSignaturePosition('bottom-left')}
                  >
                    <Text style={[styles.posBtnText, signaturePosition === 'bottom-left' && styles.posBtnTextActive]}>Izquierda</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.posBtn, signaturePosition === 'bottom-right' && styles.posBtnActive]}
                    onPress={() => setSignaturePosition('bottom-right')}
                  >
                    <Text style={[styles.posBtnText, signaturePosition === 'bottom-right' && styles.posBtnTextActive]}>Derecha</Text>
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

          {/* Signature Creator Panel */}
          <Text style={styles.sectionTitle}>Crea tu Firma</Text>
          <View style={styles.signatureCard}>
            {/* Mode selection tabs */}
            <View style={styles.modeTabs}>
              <TouchableOpacity
                style={[styles.modeTabBtn, signatureMode === 'draw' && styles.modeTabBtnActive]}
                onPress={() => {
                  setSignatureMode('draw');
                  handleClearSignature();
                }}
              >
                <Text style={[styles.modeTabText, signatureMode === 'draw' && styles.modeTabTextActive]}>Dibuja tu firma</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeTabBtn, signatureMode === 'saved' && styles.modeTabBtnActive]}
                onPress={() => {
                  setSignatureMode('saved');
                  setIsDrawn(true);
                  setIsPositioned(true);
                }}
              >
                <Text style={[styles.modeTabText, signatureMode === 'saved' && styles.modeTabTextActive]}>Usar guardada</Text>
              </TouchableOpacity>
            </View>

            {signatureMode === 'draw' ? (
              <View style={styles.drawViewport}>
                {isDrawn ? (
                  <View style={styles.drawnSignature}>
                    <Text style={styles.sigDrawingText}>Santiago V.</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.drawPrompt}
                    onPress={handleDrawSimulate}
                    activeOpacity={0.8}
                  >
                    <PenTool size={32} color={colors.neutral.gray500} style={{ marginBottom: 8 }} />
                    <Text style={styles.drawPromptText}>Presiona aquí para simular trazo de firma</Text>
                    <Text style={styles.drawPromptSub}>Simula el trazo con el dedo sobre la pantalla</Text>
                  </TouchableOpacity>
                )}

                {isDrawn && (
                  <TouchableOpacity style={styles.clearBtn} onPress={handleClearSignature} activeOpacity={0.7}>
                    <RotateCcw size={14} color={colors.neutral.gray600} />
                    <Text style={styles.clearBtnText}>Borrar trazo</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              // Saved signature mode
              <View style={styles.savedSignatureContainer}>
                <View style={styles.savedSigCard}>
                  <Text style={styles.savedSigTitle}>Firma Corporativa Registrada</Text>
                  <Text style={styles.sigDrawingText}>Santiago V.</Text>
                  <Text style={styles.savedSigMeta}>Sincronizada • Modificado 12 May</Text>
                </View>
              </View>
            )}
          </View>

          {/* Audit / Summary Card */}
          <Text style={styles.sectionTitle}>Resumen de Auditoría</Text>
          <View style={styles.auditCard}>
            <View style={styles.auditRow}>
              <Text style={styles.auditLabel}>Documento:</Text>
              <Text style={styles.auditValue} numberOfLines={1}>{fileItem.name}</Text>
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

          <View style={{ height: 60 }} />
        </ScrollView>

        {/* Confirmation Footer Bar */}
        <View style={styles.footerBar}>
          <TouchableOpacity
            style={[
              styles.signConfirmBtn,
              (!isDrawn || !isPositioned) && styles.signConfirmBtnDisabled,
            ]}
            disabled={!isDrawn || !isPositioned}
            onPress={handleConfirmSignature}
            activeOpacity={0.8}
          >
            <Check size={20} color={colors.neutral.white} />
            <Text style={styles.signConfirmBtnText}>Firmar Documento</Text>
          </TouchableOpacity>
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
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
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
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
    fontWeight: '800',
    color: colors.brand.primary,
    marginBottom: 4,
  },
  miniDocSub: {
    fontSize: 10,
    fontWeight: '600',
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
    fontWeight: '700',
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
    fontWeight: '600',
    color: colors.neutral.gray700,
  },
  posBtnTextActive: {
    color: colors.brand.primary,
    fontWeight: '700',
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
    fontWeight: '700',
    color: colors.neutral.text,
  },
  stampDate: {
    fontSize: 6,
    color: colors.neutral.gray600,
    fontWeight: '600',
  },
  signatureCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    overflow: 'hidden',
  },
  modeTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
  },
  modeTabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.neutral.gray50,
  },
  modeTabBtnActive: {
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 2,
    borderBottomColor: colors.brand.primary,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.gray700,
  },
  modeTabTextActive: {
    color: colors.brand.primary,
    fontWeight: '700',
  },
  drawViewport: {
    height: 160,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  drawPrompt: {
    width: '100%',
    height: '100%',
    borderWidth: 1.5,
    borderColor: colors.neutral.gray300,
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFBFD',
  },
  drawPromptText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  drawPromptSub: {
    fontSize: 10,
    color: colors.neutral.gray600,
    marginTop: 4,
    fontWeight: '500',
  },
  drawnSignature: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sigDrawingText: {
    fontFamily: Platform.OS === 'ios' ? 'Zapfino' : 'cursive',
    fontSize: 28,
    color: '#1D4ED8',
    transform: [{ rotate: '-3deg' }],
  },
  clearBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.gray50,
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  clearBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.neutral.gray700,
  },
  savedSignatureContainer: {
    height: 160,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  savedSigCard: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  savedSigTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7C3AED',
    marginBottom: 8,
  },
  savedSigMeta: {
    fontSize: 9,
    color: colors.neutral.gray600,
    fontWeight: '500',
    marginTop: 8,
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
    fontWeight: '600',
  },
  auditValue: {
    fontSize: 12,
    fontWeight: '700',
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
    fontWeight: '700',
  },
  footerBar: {
    backgroundColor: colors.neutral.white,
    borderTopWidth: 1,
    borderColor: colors.neutral.gray100,
    padding: 16,
  },
  signConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  signConfirmBtnDisabled: {
    backgroundColor: colors.neutral.gray400,
  },
  signConfirmBtnText: {
    color: colors.neutral.white,
    fontSize: 14,
    fontWeight: '700',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  backLink: {
    marginTop: 12,
  },
  backLinkText: {
    fontSize: 14,
    color: colors.brand.primary,
    fontWeight: '700',
  },
});
